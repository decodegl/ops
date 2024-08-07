const fal = op.require('@fal-ai/serverless-client');
const https = op.require('https');

const inTrigger = op.inTriggerButton("Generate");
const inAPI = op.inString('API KEY');
const inModel = op.inString('Model', "fal-ai/flux-pro");
const inPrompt = op.inString("Prompt", "");
const inImageSize = op.inSwitch("Image Size", ["square_hd", "square", "portrait_4_3", "portrait_16_9", "landscape_4_3", "landscape_16_9"], "landscape_4_3");
const inInferenceSteps = op.inInt("Inference Steps", 4);
const inSeed = op.inInt("Seed", -1);
const inGuidanceScale = op.inFloat("Guidance Scale", 3.5);
const inSyncMode = op.inBool("Sync Mode", true);
const inNumImages = op.inInt("Number of Images", 1);
const inSafetyTolerance = op.inSwitch("Safety Tolerance", ["1", "2", "3", "4", "5", "6"], "2");
const inCancelTrigger = op.inTriggerButton("Cancel generation");

const outFinished = op.outTrigger("Finished");
const outImages = op.outArray("Generated Images");
const outTimings = op.outObject("Timings");
const outSeed = op.outNumber("Seed Used");
const outNSFW = op.outArray("NSFW Flags");
const outProgress = op.outString('Progress');
const outError = op.outString("Error");


let cancelUrl = ''; // Store the cancel URL

inCancelTrigger.onTriggered = cancelRequest;

inTrigger.onTriggered = async () => {

    const originalWarn = console.warn;
    console.warn = (message, ...optionalParams) => {
      if (!message.includes("The fal credentials are exposed in the browser's environment.")) {
        originalWarn(message, ...optionalParams);
      }
    };

    try {
        fal.config({
            credentials: inAPI.get()
        });

        outError.set("");
        outProgress.set('');

        const input = {
            prompt: inPrompt.get(),
            image_size: inImageSize.get(),
            num_inference_steps: inInferenceSteps.get(),
            guidance_scale: inGuidanceScale.get(),
            sync_mode: inSyncMode.get(),
            num_images: inNumImages.get(),
            safety_tolerance: inSafetyTolerance.get()
        };

        const seed = inSeed.get();
        if (seed > -1) {
            input['seed'] = seed;
        }

        const result = await fal.subscribe(inModel.get(), {
            input: input,
            logs: true,
            onQueueUpdate: (update) => {
                if (update.status === "IN_QUEUE") {
                    // console.log(update);
                    outProgress.set('Queuing...');
                    cancelUrl = update.cancel_url; // Store the cancel URL
                }
            },
        });

        if (result.error) {
            op.logError(result.error.message);
            op.setUiError("falAI", result.error.message);
            outError.set(result.error.message);
            outProgress.set('error');
            return;
        }

        outError.set("");
        outProgress.set('finished');
        outImages.setRef(result.images.map(img => img.url));
        outTimings.setRef(result.timings);
        outSeed.set(result.seed);
        outNSFW.setRef(result.has_nsfw_concepts);

        outFinished.trigger();
    } catch (err) {
        outError.set(err.message);
    }

    console.warn = originalWarn;
};


// Cancel the request
function cancelRequest() {
    if (!cancelUrl) {
        outError.set("No cancel URL available.");
        return;
    }

    console.log(cancelUrl);
    const parsedUrl = new URL(cancelUrl);

    const options = {
        hostname: parsedUrl.hostname,
        path: parsedUrl.pathname,
        method: 'PUT', // Use PUT for cancellation
    };

    const req = https.request(options, (res) => {
        res.on('data', () => {}); // Drain the data stream
        res.on('end', () => {
            if (res.statusCode === 200) {
                outProgress.set("Request canceled successfully.");
            } else {
                outError.set(`Failed to cancel request: ${cancelUrl}, ${res.statusCode} ${res.statusMessage}`);
            }
        });
    });

    req.on('error', (err) => {
        outError.set(`Request error: ${err.message}`);
        op.logError("Cancellation error:", err);
    });

    req.end();
}
