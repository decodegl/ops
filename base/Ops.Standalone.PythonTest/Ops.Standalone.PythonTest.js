const pythonia = op.require('pythonia');
const python = pythonia.python;
const py = pythonia.py;


const inBtn = op.inTriggerButton('Run');

inBtn.onTriggered = test;


function test() {(async () => {

    console.log("HELLO");

    const torch = await python('torch');

    console.log(`CUDA: ${await torch.cuda.is_available()}`);
    const x = await torch.rand(5, 3);
    console.log(`random tensor ${await x}`);
})();}


op.onDelete = () => {
    if (python)
        python.exit();
}