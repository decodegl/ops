const niceware = op.require('niceware');

const inCount = op.inInt('Count');
const outResults = op.outArray('Names');


inCount.onChange = () => {
    let c = inCount.get();

    if (c < 1) {
        c = 2;
    } else {
        c *= 2;
    }
    const passphrase = niceware.generatePassphrase(c);
    outResults.setRef(passphrase);
}