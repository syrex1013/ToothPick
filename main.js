const fs = require("fs");
const path = require("path");
const { exec } = require("child_process");

// Read file ping.ps1 and save content as base64
const ping = fs.readFileSync(path.join(__dirname, "ping.ps1"), "utf8");
const encodedPing = Buffer.from(ping, "utf8").toString("base64");

// Create variable with PowerShell code with one empty variable that will contain the base64 encoded ping.ps1 and execute it.
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

// Save as .bat file
fs.writeFileSync(path.join(__dirname, "ping.bat"), powershellCommand);

// Execute the command
exec(powershellCommand, (error, stdout, stderr) => {
  if (error) {
    console.error(`exec error: ${error}`);
    return;
  }
  console.log(`stdout: ${stdout}`);
  console.error(`stderr: ${stderr}`);
});
