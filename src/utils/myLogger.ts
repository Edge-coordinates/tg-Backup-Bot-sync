import fs from "fs-extra";

export function BasicErrorLog(message: string) {
  fs.appendFile("error-log.txt", message, (fileErr) => {
    if (fileErr) {
      console.error("Error writing to log file:", fileErr);
    } else {
      console.log("Logged error to error-log.txt");
    }
  });
}
