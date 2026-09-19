import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import tailwind from "@tailwindcss/vite"
import path from "path";
import runableAnalyticsPlugin from "./vite/plugins/runable-analytics-plugin";
import honoDevPlugin from "./vite/plugins/hono-dev-plugin";
import assetOptimizerPlugin from "./vite/plugins/asset-optimizer-plugin";

const root = path.resolve(__dirname);

export default defineConfig(({ command, mode }) => {
	const env = loadEnv(mode, root, '');
	delete env.NODE_ENV;
	Object.assign(process.env, env);
	process.env.NODE_ENV = command === "build" ? "production" : "development";

	const plugins = [honoDevPlugin(), react(), runableAnalyticsPlugin(), tailwind(), assetOptimizerPlugin()];

	return {
		// All env files live at the repo root — keep Vite's own env loading there too,
		// so packages/web/.env* files can never shadow the root .env.
		envDir: root,
		define: {
			"process.env.NODE_ENV": JSON.stringify(command === "build" ? "production" : "development"),
		},
		plugins,
		resolve: {
			alias: {
				"@": path.resolve(__dirname, "./src/web"),
			},
		},
		server: {
			allowedHosts: true,
			hmr: { overlay: false, },
			cors: false
		}
	};
});
