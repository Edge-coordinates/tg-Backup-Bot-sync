import fs from "fs-extra";

export function BasicErrorLog(message: string, fileName: string = "error-log.txt") {
  fs.appendFile(fileName, message, (fileErr) => {
    if (fileErr) {
      console.error("Error writing to log file:", fileErr);
    } else {
      console.log("Logged error to error-log.txt");
    }
  });
}
