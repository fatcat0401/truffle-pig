import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
    resolve: {
        alias: {
            // "server-only" throws outside a React Server Component; tests import server modules directly
            "server-only": fileURLToPath(new URL("./tests/server-only-stub.ts", import.meta.url)),
            "@": fileURLToPath(new URL("./", import.meta.url)),
        },
    },
    test: {
        include: ["tests/**/*.test.ts"],
        environment: "node",
    },
});
