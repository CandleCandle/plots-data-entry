import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));


export default {
	entry: ['./src/index.js'],

	module: {
		rules: [
			{ test: /.ts$/, use: 'ts-loader' },
			{
				test: /.m?js$/,
				exclude: /node_modules/,
				use: {
					loader: 'babel-loader',
					options: {
						presets: ['@babel/preset-env'],
					}
				}
			}
		],
	},

	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: 'plots-data-entry.bundle.js',
	},

	optimization: {
        minimize: false
    },

	devtool: 'source-map',
}
