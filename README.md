<<<<<<< HEAD
# ShopCop

App/web application that allows users to use there phone, tablet, or laptop(not as effective) cameras to scan barcodes on the items within multiple stores dependent on your location(or accessible manually). Main purpose is to keep track of your items within a store as you go to keep track of all the costs while shopping in person.

## Features

- 📷 **Barcode Scanning**: Use your device's camera to scan product barcodes in real-time
- 💰 **Price Tracking**: Automatically fetches product information and displays prices
- 🛒 **Shopping Cart**: Add multiple items and adjust quantities
- 🧮 **Price Calculation**: Automatically calculates subtotal, tax, and total
- 📱 **Responsive Design**: Works on desktop and mobile devices

## Technologies Used

- React 18
- Vite
- html5-qrcode (for barcode scanning)
- Open Food Facts API (for product information)

## Getting Started

### Installation

1. Navigate to the project directory:
```bash
cd grocery-scanner
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:3000`

### Usage

1. Click "Start Scanning" to activate the camera
2. Point your camera at a product barcode
3. The app will automatically:
   - Detect the barcode
   - Fetch product information
   - Add the item to your cart with a price
   - Update your total

4. Adjust quantities using the +/- buttons
5. Remove items by clicking the trash icon
6. View your subtotal, estimated tax, and total at the bottom

## Important Notes

- **Camera Permissions**: The app requires camera access to scan barcodes. Make sure to grant permissions when prompted.
- **Product Prices**: If a product isn't found in the Open Food Facts database, the app generates a realistic price based on the barcode for demonstration purposes.
- **Tax Rate**: The default tax rate is set to 8%. You can adjust this in `src/App.jsx` by changing the `TAX_RATE` constant.
- **HTTPS**: For production use, the app must be served over HTTPS for camera access to work (browsers require HTTPS for camera API access).

## Browser Compatibility

Works best on modern browsers with camera access support:
- Chrome/Edge 
- Firefox
- Safari (on iOS/macOS)
- Mobile browsers with camera support

## License

MIT
=======

>>>>>>> 6e83660a98a9816c949f0f6a82cb69726c245a5c
