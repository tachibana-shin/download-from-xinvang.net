import axios from "axios";
import { JSDOM } from "jsdom";
import chalk from "chalk";
import downloadFile from "download-file";
import { basename } from "path";

const COUNT_ONE_TASK = 2;

const [url, directory = "./", limit = Infinity] = process.argv.slice(2);

function createTask<T>(array: readonly T[]): readonly T[][] {
  const tasks: T[][] = [];

  const { length } = array;
  const lengthTasks = Math.ceil(length / COUNT_ONE_TASK) - 1;

  for (let index = 0; index < lengthTasks; index++) {
    tasks.push(
      array.slice(index * COUNT_ONE_TASK, (index + 1) * COUNT_ONE_TASK)
    );
  }

  return tasks;
}

function download(url: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    downloadFile(
      url,
      {
        directory,
        filename: basename(url.replace(/^[a-z]+:\/\//i, "")),
      },
      (err: any) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      }
    );
  });
}

async function init() {
  console.log(chalk.blue(`Getting pages mp3 from ${url}`));

  const { document } = new JSDOM((await axios.get<string>(url)).data).window;

  const listPageMP3 = Array.from(document.querySelectorAll(".fn-song a"))
    .map((item: any) => item.getAttribute("href"))
    .filter((item) => {
      if (!!item) {
        return true;
      }
    })
    .slice(0, +limit) as string[];

  console.log(chalk.blue(`Getting url mp3 from ${listPageMP3.length} pages`));

  const tasks = createTask<string>(listPageMP3);
  const tasksResults: (string | null)[][] = [];

  for (const task of tasks) {
    console.log(`Running task ${tasks.indexOf(task) + 1}/${tasks.length}`);

    const taskResults = await Promise.all(
      task.map(async (url) => {
        /// url page
        const { document } = new JSDOM((await axios.get<string>(url)).data)
          .window;

        return (
          document.querySelector("#tabService")?.getAttribute("href") ?? null
        );
      })
    );

    tasksResults.push(taskResults);
  }

  console.log(chalk.green("Scan done"));
  console.log(chalk.blue(`Downloading mp3 from ${tasksResults.length} task`));

  const tasksDownloadResult = [];
  for (const task of tasksResults) {
    console.log(
      `Download mp3 from task ${tasksResults.indexOf(task) + 1}/${tasks.length}`
    );

    const taskResults = await Promise.all(
      task.map(async (url) => {
        if (url) {
          return download(url);
        } else {
          return false;
        }
      })
    );

    console.log(
      chalk.green(`Done task ${tasksResults.indexOf(task) + 1}/${tasks.length}`)
    );

    tasksDownloadResult.push(taskResults);
  }

  console.log(
    chalk.green(
      `Download success ${
        tasksDownloadResult.flat(2).filter((item) => item !== false).length
      }/${tasksDownloadResult.flat(2).length}`
    )
  );
  console.log(
    chalk.red(
      `Download success ${
        tasksDownloadResult.flat(2).filter((item) => item === false).length
      }/${tasksDownloadResult.flat(2).length}`
    )
  );
}

void init();
