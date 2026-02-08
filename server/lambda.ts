import "dotenv/config";
import serverless from "serverless-http";
import { createApp } from "./app";

let serverlessHandler: any;

export const handler = async (event: any, context: any) => {
    if (!serverlessHandler) {
        const app = await createApp();
        serverlessHandler = serverless(app);
    }
    return serverlessHandler(event, context);
};
