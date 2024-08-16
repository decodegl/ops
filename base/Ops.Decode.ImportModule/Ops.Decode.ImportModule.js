const inLoad = op.inTriggerButton("Load");
const inUrl = op.inString('Full URL');
const inModuleType = op.inSwitch('Module Type', ['ES6', 'UMD'], 'ES6');
const inImportType = op.inSwitch('ES6 import Type', ['default', 'named'], 'default');
const inAlias = op.inString('Aliased name in window object', 'MyModule');

const outLoaded = op.outTrigger("Loaded");
const outLoadedStatus = op.outBool("Has loaded", false);
const outErrorStr = op.outString('Error?');


function loadUMDModule(url, moduleName) {
    return new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.type = "text/javascript";
        script.async = true;
        script.src = url;

        script.onload = () => {
            op.log(`${moduleName} module loaded.`);
            if (window[moduleName]) {
                resolve(window[moduleName]);
            } else {
                reject(new Error(`Module ${moduleName} not found on window after script load.`));
            }
        };

        script.onerror = () => {
            reject(new Error(`Failed to load module script with URL ${url}`));
        };

        document.head.appendChild(script);
    });
}


function importModule(url, alias, moduleType) {
    if (moduleType === 'UMD') {
        return loadUMDModule(url, alias)
            .then(module => {
                if (alias !== moduleName && window[moduleName]) {
                    window[alias] = window[moduleName];
                    op.log(`UMD module ${moduleName} assigned to window under alias ${alias}.`);
                }
            });
    } else {  // Handle ES6 module import
        return new Promise((resolve, reject) => {
            let importStatement;
            if (inImportType.get() === 'named') {
              importStatement = `import * as m from "${url}";`;
            } else {  // default import
              importStatement = `import m from "${url}";`;
            }

            const code = `
                ${importStatement}
                console.log('Imported module:', m);  // Debug: Log the imported module
                window.${alias} = {};
                Object.keys(m).forEach(key => {
                    window.${alias}[key] = m[key];
                    // console.log(\`Assigning \${key} to window.${alias}\`);  // Debug each assignment
                });
                // console.log('Final window object:', window.${alias});  // Debug: Log the final window object
            `;

            const blob = new Blob([code], { type: 'text/javascript' });
            const blobURL = URL.createObjectURL(blob);

            const script = document.createElement("script");
            script.type = "module";
            script.src = blobURL;

            script.onload = () => {
            //   console.log(`Module ${url} loaded.`);
              URL.revokeObjectURL(blobURL); // Clean up the blob URL
              resolve();
            };

            script.onerror = () => {
              reject(new Error("Failed to load module script with URL " + url));
              URL.revokeObjectURL(blobURL); // Clean up the blob URL
              outLoadedStatus.set(false);
            };

            document.documentElement.appendChild(script);
        });
    }
}

// function importModule(url, alias) {
//   return new Promise((resolve, reject) => {
//     let importStatement;
//     if (inImportType.get() === 'named') {
//       importStatement = `import * as m from "${url}";`;
//     } else {  // default import
//       importStatement = `import m from "${url}";`;
//     }

//     const code = `
//         ${importStatement}
//         console.log('Imported module:', m);  // Debug: Log the imported module
//         window.${alias} = {};
//         Object.keys(m).forEach(key => {
//             window.${alias}[key] = m[key];
//             // console.log(\`Assigning \${key} to window.${alias}\`);  // Debug each assignment
//         });
//         // console.log('Final window object:', window.${alias});  // Debug: Log the final window object
//     `;

//     const blob = new Blob([code], { type: 'text/javascript' });
//     const blobURL = URL.createObjectURL(blob);

//     const script = document.createElement("script");
//     script.type = "module";
//     script.src = blobURL;

//     script.onload = () => {
//     //   console.log(`Module ${url} loaded.`);
//       URL.revokeObjectURL(blobURL); // Clean up the blob URL
//       resolve();
//     };

//     script.onerror = () => {
//       reject(new Error("Failed to load module script with URL " + url));
//       URL.revokeObjectURL(blobURL); // Clean up the blob URL
//       outLoadedStatus.set(false);
//     };

//     document.documentElement.appendChild(script);
//   });
// }

inLoad.onTriggered = () => {
  importModule(inUrl.get(), inAlias.get(), inModuleType.get())
    .then(() => {
        outLoaded.trigger();
        outLoadedStatus.set(true);
        outErrorStr.set('');
    })
    .catch(error => {
        op.logError("Error importing module:", error);
        outLoadedStatus.set(false);
        outErrorStr.set(error.message);
    });
};


