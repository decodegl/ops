const child_process = op.require('child_process');

const inRun = op.inTriggerButton("Run");
const inCmd = op.inString("Command", "echo Hello, world!");

const outOnSuccess = op.outTrigger("On success");
const outOnError = op.outTrigger("On Error");
const outStdOut = op.outString('Stdout');
const outStderr = op.outString('Stderr');
const outErr = op.outString('Error');


// Function to execute a command
function runCommand(command) {

    child_process.exec(command, (error, stdout, stderr) => {
        if (error) {
            op.logError(`exec error: ${error}`);
            outErr.set(`${error}`);
            outOnError.trigger();
            return;
        }
        if (stderr) {
            op.logError(`stderr: ${stderr}`);
            outStderr.set(`${stderr}`);
            outOnError.trigger();
            return;
        }
        outStdOut.set(`${stdout.trim()}`);
        outOnSuccess.trigger();
    });
}


inRun.onTriggered = () => {
    const cmd = inCmd.get();
    outStdOut.set('');
    outStderr.set('');
    outErr.set('');
    if (!cmd) {
        outErr.set('No command');
        return;
    }
    runCommand(cmd);
}
