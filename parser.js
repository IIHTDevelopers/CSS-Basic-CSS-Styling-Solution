const fs = require('fs');
const { JSDOM } = require('jsdom');
const axios = require('axios');
const xmlBuilder = require('xmlbuilder');
const { v4: uuidv4 } = require('uuid');

// Define TestCaseResultDto
class TestCaseResultDto {
    constructor(methodName, methodType, actualScore, earnedScore, status, isMandatory, errorMessage) {
        this.methodName = methodName;
        this.methodType = methodType;
        this.actualScore = actualScore;
        this.earnedScore = earnedScore;
        this.status = status;
        this.isMandatory = isMandatory;
        this.errorMessage = errorMessage;
    }
}

// Define TestResults
class TestResults {
    constructor() {
        this.testCaseResults = {};
        this.customData = '';
    }
}

// Function to delete output files if they exist
function deleteOutputFiles() {
    const outputFiles = [
        "./output_revised.txt",
        "./output_boundary_revised.txt",
        "./output_exception_revised.txt"
    ];

    outputFiles.forEach(file => {
        // Check if the file exists
        if (fs.existsSync(file)) {
            // Delete the file if it exists
            fs.unlinkSync(file);
            console.log(`Deleted: ${file}`);
        }
    });
}

// Function to check required HTML tags
function checkHtmlTags(htmlContent, requiredTags) {
    const dom = new JSDOM(htmlContent);
    const results = {};

    requiredTags.forEach(tag => {
        const tagFound = dom.window.document.getElementsByTagName(tag).length > 0;
        console.log(tag, " found result : ", tagFound);
        results[tag] = tagFound ? 'pass' : 'fail';
    });

    return results;
}

// function checkCssStyles(htmlContent, requiredStyles) {
//     const dom = new JSDOM(htmlContent);
//     const styleTags = dom.window.document.querySelectorAll('head > style');
//     const results = {};

//     if (styleTags.length > 0) {
//         console.log('Found <style> tags in <head> section.');

//         const cssContent = Array.from(styleTags).map(tag => tag.textContent).join(' ');

//         requiredStyles.forEach(({ selector, properties }) => {
//             console.log(`Checking CSS for selector: ${selector}`);

//             const regexSelector = new RegExp(`${selector}\\s*{[^}]*}`, 'gi'); // Match the CSS selector and its block
//             const selectorMatch = regexSelector.exec(cssContent);
//             results[selector] = {};

//             if (selectorMatch) {
//                 console.log(`Selector "${selector}" found in CSS.`);
//                 const rules = selectorMatch[0];
                
//                 properties.forEach(({ key, value }) => {
//                     console.log(`Checking property "${key}" for selector "${selector}".`);
//                     const regexProperty = new RegExp(`${key}\\s*:\\s*${value}`, 'gi'); // Match the property and its value
//                     const propertyMatch = regexProperty.test(rules);
                    
//                     if (propertyMatch) {
//                         console.log(`Property "${key}" with value "${value}" found for selector "${selector}".`);
//                     } else {
//                         console.log(`Property "${key}" with value "${value}" NOT found for selector "${selector}".`);
//                     }
                    
//                     results[selector][key] = propertyMatch ? 'pass' : 'fail';
//                 });
//             } else {
//                 console.log(`Selector "${selector}" NOT found in CSS.`);
//                 properties.forEach(({ key }) => {
//                     console.log(`Marking property "${key}" as "fail" for missing selector "${selector}".`);
//                     results[selector][key] = 'fail'; // Mark all properties as 'fail' if selector is missing
//                 });
//             }
//         });
//     } else {
//         console.log('No <style> tags found in <head> section.');
//         requiredStyles.forEach(({ selector, properties }) => {
//             console.log(`No CSS rules available for selector "${selector}". Marking all properties as "fail".`);
//             results[selector] = {};
//             properties.forEach(({ key }) => {
//                 results[selector][key] = 'fail'; // Mark all properties as 'fail' if no <style> tags are found
//             });
//         });
//     }

//     console.log('Final results:', results);
//     return results;
// }
function checkCssStyles(htmlContent, requiredStyles) {
    const dom = new JSDOM(htmlContent);
    const styleTags = dom.window.document.querySelectorAll('head > style');
    const results = {};

    if (styleTags.length > 0) {
        console.log('Found <style> tags in <head> section.');

        const cssContent = Array.from(styleTags).map(tag => tag.textContent).join(' ');

        requiredStyles.forEach(({ selector, properties }) => {
            // console.log(`Checking CSS for selector: ${selector}`);

            const regexSelector = new RegExp(`${selector}\\s*{[^}]*}`, 'gi'); // Match the CSS selector and its block
            const selectorMatch = regexSelector.exec(cssContent);

            if (selectorMatch) {
                console.log(`Selector "${selector}" found in CSS.`);
                const rules = selectorMatch[0];
                
                // Check all properties for the selector
                const allPropertiesPass = properties.every(({ key, value }) => {
                    // console.log(`Checking property "${key}" for selector "${selector}".`);
                    const regexProperty = new RegExp(`${key}\\s*:\\s*${value}`, 'gi'); // Match the property and its value
                    const propertyMatch = regexProperty.test(rules);
                    
                    if (propertyMatch) {
                        console.log(`\x1b[33mProperty "${key}" with value "${value}" found for selector "${selector}".\x1b[0m`);
                    } else {
                        console.log(`\x1b[31mProperty "${key}" with value "${value}" NOT found for selector "${selector}".\x1b[0m`);
                    }                    
                    
                    return propertyMatch; // Returns true only if the property matches
                });

                // Determine overall result for the selector
                results[selector] = allPropertiesPass ? 'pass' : 'fail';
            } else {
                console.log(`Selector "${selector}" NOT found in CSS.`);
                results[selector] = 'fail'; // Selector not found, mark as fail
            }
        });
    } else {
        console.log('No <style> tags found in <head> section.');
        requiredStyles.forEach(({ selector }) => {
            console.log(`No CSS rules available for selector "${selector}". Marking as "fail".`);
            results[selector] = 'fail'; // No styles, mark as fail for each selector
        });
    }

    console.log('Final results:', results);
    return results;
}

// Format results into the TestCaseResultDto structure
function formatTestResults(results, methodName, methodType) {
    const testCaseResult = new TestCaseResultDto(
        methodName,
        methodType,
        1,
        Object.values(results).includes('fail') ? 0 : 1, // If any result is 'fail', set score to 0
        Object.values(results).includes('fail') ? 'Failed' : 'Passed', // If any result is 'fail', set status to 'Failed'
        true, // Is Mandatory
        ''
    );    

    const testResults = new TestResults();
    const GUID = "d805050e-a0d8-49b0-afbd-46a486105170";  // Generate a unique GUID for each test case
    testResults.testCaseResults[GUID] = testCaseResult;
    testResults.customData = 'Custom data goes here';  // Placeholder for custom data

    return testResults;
}

// Generate XML report (just like Angular code)
function generateXmlReport(result) {
    const xml = xmlBuilder.create('test-cases')
        .ele('case')
        .ele('test-case-type', result.status)
        .up()
        .ele('name', result.methodName)
        .up()
        .ele('status', result.status)
        .up()
        .end({ pretty: true });
    return xml;
}

// Function to write to output files
function writeOutputFiles(result, fileType) {
    let resultStatus = result.status === 'Passed' ? 'PASS' : 'FAIL';
    let output = `${result.methodName}=${resultStatus}\n`;

    const outputFiles = {
        functional: "./output_revised.txt",
        boundary: "./output_boundary_revised.txt",
        exception: "./output_exception_revised.txt",
        xml: "./yaksha-test-cases.xml"
    };

    // Choose the file based on the type
    let outputFilePath = outputFiles[fileType];
    if (outputFilePath) {
        fs.appendFileSync(outputFilePath, output);
    }
}

// Read the custom.ih file (similar to Angular code)
function readCustomFile() {
    let customData = '';
    try {
        customData = fs.readFileSync('../custom.ih', 'utf8');
    } catch (err) {
        console.error('Error reading custom.ih file:', err);
    }
    return customData;
}

// Dynamic function to handle the test case execution
async function handleTestCase(filePath, testCaseName, testCaseType, testLogic, extraParams = {}) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');

        // Read custom.ih file content
        const customData = readCustomFile();

        // Execute the test logic based on test case type
        const results = testLogic(data, ...extraParams);
        console.log("results");
        console.log(results);
        
        // Format test results and attach custom data
        const testResults = formatTestResults(results, testCaseName, testCaseType);
        testResults.customData = customData;

        // console.log(`${testCaseType} Results:`, results);
        console.log(`Sending data as:`, testResults);
        
        // Send results to the server
        // const response = await axios.post('https://yaksha-prod-sbfn.azurewebsites.net/api/YakshaMFAEnqueue?code=jSTWTxtQ8kZgQ5FC0oLgoSgZG7UoU9Asnmxgp6hLLvYId/GW9ccoLw==', testResults, {
        const response = await axios.post('https://compiler.techademy.com/v1/mfa-results/push', testResults, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        console.log(`${testCaseType} Test Case Server Response:`, response.data);

        // Generate XML report and save to file
        const xml = generateXmlReport(testResults.testCaseResults[Object.keys(testResults.testCaseResults)[0]]);
        fs.writeFileSync(`${testCaseType.toLowerCase().replace(' ', '-')}-test-report.xml`, xml);

        // Write to output files (functional, boundary, exception)
        writeOutputFiles(testResults.testCaseResults[Object.keys(testResults.testCaseResults)[0]], 'functional');
    } catch (error) {
        console.error(`Error executing ${testCaseType} test case:`, error);
    }
}

// File path for the HTML file to check
const filePath = 'index.html';

// Define test cases
const htmlTagsTestCase = {
    testCaseName: 'HTML Tags Test',
    testCaseType: 'boundary',
    testLogic: checkHtmlTags,
    extraParams: [['html', 'body', 'title', 'h1', 'p']]
};

const requiredStyles = [
    {
        selector: 'body',
        properties: [
            { key: 'background-color', value: 'lightblue' },
            { key: 'font-family', value: 'Arial, sans-serif' }
        ]
    },
    {
        selector: 'h1',
        properties: [
            { key: 'color', value: 'darkblue' }
        ]
    },
    {
        selector: 'p',
        properties: [
            { key: 'color', value: 'darkgreen' },
            { key: 'padding', value: '10px' }
        ]
    }
];

const cssTestCase = {
    testCaseName: 'CSS Styles Test',
    testCaseType: 'boundary',
    testLogic: checkCssStyles,
    extraParams: [requiredStyles]
};

function executeAllTestCases() {
    // Delete the output files before running the tests
    deleteOutputFiles();
    
    // Execute both test cases dynamically
    handleTestCase(filePath, htmlTagsTestCase.testCaseName, htmlTagsTestCase.testCaseType, htmlTagsTestCase.testLogic, htmlTagsTestCase.extraParams);
 
    // Execute the CSS styles test case
    handleTestCase(filePath, cssTestCase.testCaseName, cssTestCase.testCaseType, cssTestCase.testLogic, cssTestCase.extraParams);
}

executeAllTestCases();
