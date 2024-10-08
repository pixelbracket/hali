import { invoke } from "@tauri-apps/api";
import { message } from "@tauri-apps/api/dialog";
import {
    BaseDirectory,
    createDir,
    exists,
    readTextFile,
    writeTextFile,
} from "@tauri-apps/api/fs";
import { exit } from "@tauri-apps/api/process";

import type { Config, ParseResult, Todo } from "./types";

export const defaultConfig: Config = {
    haliPath: null,
};

/** @example
 * await delay(5000);
 */
export const delay = (ms: number) => new Promise((res) => setTimeout(res, ms));

export const getTodoList = async (): Promise<Todo[]> => {
    const config = await getConfig();
    if (!config) {
        await saveConfig(defaultConfig);
        return getAppDataTodoList();
    }

    if (config.haliPath !== null) {
        if (!(await exists(config.haliPath))) {
            await saveConfig(defaultConfig);
            return getAppDataTodoList();
        }
        return getCustomPathTodoList(config.haliPath);
    } else {
        return getAppDataTodoList();
    }
};
export const saveTodoList = async (
    todoListPromise: Promise<Todo[]>
): Promise<void> => {
    const config = await getConfig();
    if (!config) {
        await saveConfig(defaultConfig);
        return;
    }

    if (config.haliPath !== null) {
        if (!(await exists(config.haliPath))) {
            await saveConfig(defaultConfig);
            saveAppDataTodoList(todoListPromise);
            return;
        }
        saveCustomPathTodoList(config.haliPath, todoListPromise);
        return;
    } else {
        saveAppDataTodoList(todoListPromise);
        return;
    }
};

export const getCustomPathTodoList = async (
    filePath: string
): Promise<Todo[]> => {
    const todoListHali = await readTextFile(filePath);
    const parseResult: ParseResult = await invoke("parse_hali_format", {
        input: todoListHali,
    });

    if (!parseResult.successful && parseResult.error_message !== "") {
        throw new Error(parseResult.error_message?.toString());
    }
    return parseResult.todos;
};
export const saveCustomPathTodoList = async (
    filePath: string,
    todoListPromise: Promise<Todo[]>
): Promise<void> => {
    const stringifiedTodoList: string = await invoke("stringify_hali_format", {
        input: await todoListPromise,
    });
    await writeTextFile(filePath, stringifiedTodoList);
};

export const getAppDataTodoList = async (): Promise<Todo[]> => {
    await createDir("users", {
        dir: BaseDirectory.AppData,
        recursive: true,
    });

    if (await exists("todos.hali", { dir: BaseDirectory.AppData })) {
        const todoListHali = await readTextFile("todos.hali", {
            dir: BaseDirectory.AppData,
        });
        const parseResult: ParseResult = await invoke("parse_hali_format", {
            input: todoListHali,
        });

        if (!parseResult.successful && parseResult.error_message !== "") {
            throw new Error(parseResult.error_message?.toString());
        }
        return parseResult.todos;
    } else {
        return [];
    }
};
export const saveAppDataTodoList = async (
    todoListPromise: Promise<Todo[]>
): Promise<void> => {
    await createDir("users", {
        dir: BaseDirectory.AppData,
        recursive: true,
    });

    const stringifiedTodoList: string = await invoke("stringify_hali_format", {
        input: await todoListPromise,
    });
    await writeTextFile("todos.hali", stringifiedTodoList, {
        dir: BaseDirectory.AppData,
    });
};

export const getConfig = async (): Promise<Config> => {
    await createDir("users", {
        dir: BaseDirectory.AppData,
        recursive: true,
    });

    if (await exists("config.json", { dir: BaseDirectory.AppData })) {
        const configJson = await readTextFile("config.json", {
            dir: BaseDirectory.AppData,
        });
        const parsedConfig = JSON.parse(configJson);
        return parsedConfig;
    } else {
        await saveConfig(defaultConfig);
        return defaultConfig;
    }
};
export const saveConfig = async (configPromise: Config): Promise<void> => {
    await createDir("users", {
        dir: BaseDirectory.AppData,
        recursive: true,
    });

    const stringifiedConfig = JSON.stringify(await configPromise, null, 4);
    await writeTextFile("config.json", stringifiedConfig, {
        dir: BaseDirectory.AppData,
    });
};

const crash = async (text: string) => {
    await message(text, "Confirm");
    exit();
};
