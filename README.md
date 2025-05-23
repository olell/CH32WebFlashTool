# CH32WebFlash Tool

Every wanted to flash bare-metal hardware directly from your Browser? I mean what could possibly go wrong? So this is for you!

The CH32WebFlash Tool allows you to flash firmware to CH32V003 microcontrollers (running the rv003usb bootloader) directly from your browser. It is based on [CH32WebFlash](https://github.com/olell/CH32WebFlash)

## Run it locally

This repository contains a simple react web application to use the flash tool. To run it just clone the repo, go to the repo directory and install the dependencies using

```sh
npm i
```

you can start it using

```
env HTTPS=true npm start
```

since some browsers require HTTPs for WebHID to work, the development server uses a self-signed certificate which you have to allow in your browser.
