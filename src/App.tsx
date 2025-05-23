import React, { useEffect, useState } from "react";
import { Button, Card, Container } from "react-bootstrap";
import { B003Device } from "ch32webflash";

function App() {
  const [browserCompat, setBrowserCompat] = useState(false);
  const [device, setDevice] = useState<B003Device | null>(null);
  const [connected, setConnected] = useState(false);

  const [status, setStatus] = useState("Not connected");

  const [chipInfo, setChipInfo] = useState<any>({});
  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    let compat = "hid" in navigator;
    setBrowserCompat(compat);
    console.log("Browser compatibility: ", compat);
  }, [setBrowserCompat]);

  const cleanup = () => {
    setDevice(null);
    setConnected(false);
    setFile(null);
    setChipInfo({});
  };

  const upload = async () => {
    setStatus("Opening device");
    let device = new B003Device(0x1209, 0xb003);
    await device.init();

    console.log(device);

    setConnected(!!device.hd?.opened);
    setDevice(device);

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
    setChipInfo(info);
    setStatus("Chip Info aquired");

    // load file content
    if (!!!file) {
      setStatus("No file opened!");
      cleanup();
      return;
    }
    setStatus("Writing Image... (this may take a while)");
    const image = new Uint8Array(await file.arrayBuffer());
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
                <div className="my-3">
                  <input
                    type="file"
                    id="fileInput"
                    style={{ display: "none" }}
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
                <Button disabled={!!!file} onClick={() => upload()}>
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
    </div>
  );
}

export default App;
