import React, { useEffect, useRef, useState } from "react";
import { Button, Card, Container, Modal } from "react-bootstrap";
import { B003Device } from "ch32webflash";

function App() {
  const [browserCompat, setBrowserCompat] = useState(false);
  const [status, setStatus] = useState("Not connected");
  const [file, setFile] = useState<File | null>(null);

  const [isExternal, setExternal] = useState(false);
  const [externalUrl, setExternalUrl] = useState("");

  const [openFailed, setOpenFailed] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let compat = "hid" in navigator;
    setBrowserCompat(compat);
    console.log("Browser compatibility: ", compat);

    let params = new URLSearchParams(window.location.search);
    let image = params.get("image");
    if (!!image) {
      if (/^https?:\/\/.+\.bin$/i.test(image)) {
        setExternal(true);
        setExternalUrl(image);
      }
    }
  }, [setBrowserCompat]);

  const cleanup = () => {
    //setExternal(false);
    //setExternalUrl("");
    setFile(null);
    setOpenFailed(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const upload = async () => {
    setStatus("Opening device");
    let device = new B003Device(0x1209, 0xb003);

    try {
      await device.init();
    } catch {
      setOpenFailed(true);
      return;
    }

    console.log(device);

    if (!!!device || !!!device.hd) {
      setStatus("Failed opening device");
      cleanup();
      return;
    }
    setStatus("Device opened");

    let result = await device.setupInterface();
    console.log("Setup interface", result);

    if (result !== 0) {
      setStatus("Failed setting up interface");
      cleanup();
      return;
    }
    setStatus("Interface setup");

    console.log("Chip Info:");
    let info = await device.getChipInfo();
    Object.entries(info).forEach(([key, value]) => {
      // Print as 8-digit hex if value is a number
      if (typeof value === "number") {
        console.log(`${key}: ${value.toString(16).padStart(8, "0")}`);
      } else {
        console.log(`${key}: ${value}`);
      }
    });
    setStatus("Chip Info aquired");

    setStatus("Writing Image... (this may take a while)");

    let image;
    if (!isExternal) {
      // load file content
      if (!!!file) {
        setStatus("No file opened!");
        cleanup();
        return;
      }
      image = new Uint8Array(await file.arrayBuffer());
    } else {
      const response = await fetch(externalUrl);
      if (!response.ok) {
        setStatus("Failed to fetch external image!");
        cleanup();
        return;
      }
      const buffer = await response.arrayBuffer();
      image = new Uint8Array(buffer);
      console.log(image);
    }
    let r = await device.writeImage(image, 0x08000000);
    if (r !== 0) {
      setStatus(`Failed writing image (${r})`);
      cleanup();
      return;
    }

    r = await device.boot();
    if (r !== 0) {
      setStatus(`Failed booting (${r})... please reset the device`);
      cleanup();
      return;
    }

    setStatus("Done!");
    cleanup();
  };

  return (
    <div className="App">
      <Container>
        {browserCompat ? (
          <>
            <Card className="mx-auto mt-5" style={{ maxWidth: 600 }}>
              <Card.Body className="text-center">
                <Card.Title className="mb-4">CH32WebFlash</Card.Title>
                <div id="status" className="mb-2 text-secondary">
                  Status: <span id="connectionStatus">{status}</span>
                </div>
                {!isExternal && (
                  <>
                    <div className="my-3">
                      <input
                        type="file"
                        id="fileInput"
                        ref={fileInputRef}
                        style={{ display: "none" }}
                        accept=".bin"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setFile(file);
                          }
                        }}
                      />
                      <div
                        onDrop={(e) => {
                          e.preventDefault();
                          const file = e.dataTransfer.files?.[0];
                          if (file) {
                            setFile(file);
                          }
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        onClick={() =>
                          document.getElementById("fileInput")?.click()
                        }
                        style={{
                          border: "2px dashed #aaa",
                          borderRadius: 8,
                          padding: 24,
                          cursor: "pointer",
                          color: "#888",
                        }}
                      >
                        {!!!file
                          ? "Drag & drop a file here, or click to select"
                          : `Loaded ${file.name}`}
                      </div>
                    </div>
                  </>
                )}
                {isExternal && (
                  <Card className="mb-3 border-warning">
                    <Card.Body>
                      <Card.Title className="text-warning">
                        <i
                          className="bi bi-exclamation-triangle-fill"
                          style={{ marginRight: 8 }}
                        />
                        External Binary Warning
                      </Card.Title>
                      <Card.Text>
                        An external binary URL was supplied. Only flash if you
                        trust the source!
                      </Card.Text>
                      <Card className="border">
                        <Card.Body>
                          <code style={{ wordBreak: "break-all" }}>
                            {externalUrl}
                          </code>
                        </Card.Body>
                      </Card>
                    </Card.Body>
                  </Card>
                )}
                <Button
                  disabled={!!!file && !isExternal}
                  onClick={() => upload()}
                >
                  Flash to device
                </Button>
              </Card.Body>
            </Card>
          </>
        ) : (
          <>
            <Card className="mx-auto mt-5" style={{ maxWidth: 400 }}>
              <Card.Header>
                <Card.Title>Browser Not Supported</Card.Title>
              </Card.Header>
              <Card.Body>
                Your browser does not implement{" "}
                <a
                  href="https://developer.mozilla.org/de/docs/Web/API/WebHID_API#browser-kompatibilität"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  WebHID
                </a>
                !<br />
                Try Chrome, Edge, or Opera.
              </Card.Body>
            </Card>
          </>
        )}
      </Container>
      <Modal
        show={openFailed}
        onHide={() => {
          cleanup();
          setStatus("Not connected");
        }}
      >
        <Modal.Header closeButton>
          <Modal.Title>Failed to open the device!</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Your browser supports WebHID but was not able to open the device. This
          may have multiple reasons:
          <br />
          <br />
          If you're on a linux machine, you probably have to add a udev-rule to
          enable read & write access to your device. By default you are only
          allowed to read from HID devices. To do this, create a file at{" "}
          <pre>/etc/udev/rules.d/99-ch32v003.rules</pre> with following
          contents: <br />
          <code>
            {`KERNEL=="hidraw*", ATTRS{idVendor}=="1209", MODE="0664", GROUP="plugdev"`}
          </code>
          <br />
          and add your user to the plugdev group by{" "}
          <code>usermod -aG plugdev {"$your_user"}</code>
          <br />
          <br />
          For further information read this chrome for developers page:{" "}
          <a href="https://developer.chrome.com/docs/capabilities/hid">
            https://developer.chrome.com/docs/capabilities/hid
          </a>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={cleanup}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default App;
