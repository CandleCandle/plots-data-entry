import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));


let config = {
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
		path: path.resolve(__dirname, 'docs'),
		filename: 'plots-data-entry.bundle.js',
	},

	optimization: {
        minimize: true
    },

	devtool: 'source-map',
}

export default (env, argv) => {
	if (argv.mode === 'development') {
		config.devtool = 'source-map';
		config.optimization.minimize = false;
	}
	return config;
};
