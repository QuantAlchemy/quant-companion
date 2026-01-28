<p align="center">
  <img src="./public/icon-128.png" alt="TradingView Companion Logo" width="80" height="80">
</p>

# TradingView Companion

A powerful tool for analyzing and optimizing TradingView strategy results. This application allows you to export strategy data from TradingView and perform in-depth analysis of your trading performance.

## Features

- Import multiple TradingView strategy export files for portfolio analysis
- Comprehensive performance metrics and visualizations
- Web extension support for seamless integration with TradingView
- **Future support** for automatic strategy optimization and parameter analysis

## Getting Started

### Prerequisites

- Node.js (v20 or higher)
- pnpm package manager

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/tradingview-companion.git
cd tradingview-companion
```

2. Install dependencies:

```bash
pnpm install
```

### Development

Run the development server:

```bash
pnpm run dev
```

Open [http://localhost:5173](http://localhost:5173) to view it in the browser.

### Building for Production

Build the app for production:

```bash
pnpm run build
```

The build is suitable for both web deployment and web extension use.

## Usage

You can use TradingView Companion through the web application:

1. **Web Application**: Visit [https://www.quant-companion.quantalchemy.io/](https://www.quant-companion.quantalchemy.io/) to use the application directly in your browser.

### How to Use

1. Export your strategy data from TradingView using the built-in export functionality
2. Upload the exported files to the TradingView Companion web application
3. Analyze your strategy performance across multiple metrics

## Resources

- [TradingView Data Export Guide](https://www.tradingview.com/support/solutions/43000663814-how-can-i-export-trading-data/)
- [Project Demo Video 1](https://www.youtube.com/watch?v=V8oQ67uV93M)
- [Project Demo Video 2](https://www.youtube.com/watch?v=H-QyMtLjcoE)

## Contributing

Please read [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```bash
$ pnpm install
```

### Learn more on the [Solid Website](https://solidjs.com) and come chat with us on our [Discord](https://discord.com/invite/solidjs)

## Available Scripts

In the project directory, you can run:

### `pnpm run dev`

Runs the app in the development mode.<br>
Open [http://localhost:5173](http://localhost:5173) to view it in the browser.

### `pnpm run build`

Builds the app for production to the `dist` folder.<br>
It correctly bundles Solid in production mode and optimizes the build for the best performance.

This build is also sutitable for a deployment as a web-extension.

The build is minified and the filenames include the hashes.<br>
Your app is ready to be deployed!

## Deployment

Learn more about deploying your application with the [documentations](https://vitejs.dev/guide/static-deploy.html)
