const path = require('path');

const sharedConfig = {
	mode: 'production',
	resolve: {
		extensions: ['.ts', '.tsx', '.js', '.jsx'],
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				use: 'ts-loader',
				exclude: /node_modules/,
			},
			{
				test: /\.css$/,
				use: ['style-loader', 'css-loader'],
			},
		],
	},
	externals: {
		'@getflywheel/local': 'commonjs @getflywheel/local',
		'@getflywheel/local/main': 'commonjs @getflywheel/local/main',
		'@getflywheel/local-components': 'commonjs @getflywheel/local-components',
		react: 'commonjs react',
		'react-dom': 'commonjs react-dom',
		electron: 'commonjs electron',
	},
};

const mainConfig = {
	...sharedConfig,
	target: 'electron-main',
	entry: './src/main.ts',
	output: {
		filename: 'main.js',
		path: path.resolve(__dirname, 'lib'),
		libraryTarget: 'commonjs2',
	},
};

const rendererConfig = {
	...sharedConfig,
	target: 'electron-renderer',
	entry: './src/renderer.tsx',
	output: {
		filename: 'renderer.js',
		path: path.resolve(__dirname, 'lib'),
		libraryTarget: 'commonjs2',
	},
};

module.exports = [mainConfig, rendererConfig];
