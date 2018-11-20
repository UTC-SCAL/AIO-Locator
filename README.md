# AIO Locator

AIO (or all-in-one) locator is an application meant to act as a mapper for all objects, not just vehicles.

Currently, we are utilizing the following Python libraries: 

* YOLO Pipeline (for object detection)
    * Requires the TensorFlow-GPU library
* PyZbar for QR Decoding
* PyQRCode for QR Code Creation
* Imutils for QR Code Edge detection

The following have been implemented / completed:

- [x] Scan and detect QR code
- [x] Pixel-locate QR codes
- [ ] Locate an object based on distance