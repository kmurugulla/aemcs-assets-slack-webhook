/*
* <license header>
*/

/**
 * This is a sample action showcasing how to access an external API
 *
 * Note:
 * You might want to disable authentication and authorization checks against Adobe Identity Management System for a generic action. In that case:
 *   - Remove the require-adobe-auth annotation for this action in the manifest.yml of your application
 *   - Remove the Authorization header from the array passed in checkMissingRequestInputs
 *   - The two steps above imply that every client knowing the URL to this deployed action will be able to invoke it without any authentication and authorization checks against Adobe Identity Management System
 *   - Make sure to validate these changes against your security requirements before deploying the action
 */

const fetch = require('node-fetch')
const { Core } = require('@adobe/aio-sdk')
const { errorResponse, getBearerToken, stringParameters, checkMissingRequestInputs } = require('../utils')

// main function that will be executed by Adobe I/O Runtime
async function main (params) {
  // create a Logger
  const logger = Core.Logger('main', { level: params.LOG_LEVEL || 'info' });
  // replace this with the api you want to access
  const SLACK_WEBHOOK = 'webhook';

  try {
     /* handle the challenge */
    if (params.challenge) {
      logger.info('Returning challenge: ' + params.challenge);
      const returnObject = {
        statusCode: 200,
        body: JSON.stringify({
          "challenge": params.challenge
        })
      };
      return returnObject;

    } else {    
      logger.info('Event detail: ' + JSON.stringify(params.event));
      logger.info(' Available params ' + JSON.stringify(params));
     const eventCode = params.__ow_headers["x-adobe-event-code"];
      logger.info('Event Code:' + eventCode);
      //Challenge from IO Proxy Integration
      if(eventCode === "challenge"){
        //Hit the validationUrl back
        const validationResponse = await fetch(params.validationUrl);
        // if (!res.ok) {
        //   throw new Error('request to ' + SLACK_WEBHOOK + ' failed: ' + res.errorResponse)
        // }
        const challengeResponse = {
          statusCode: 200,
          body: validationResponse
        };
        return challengeResponse;
      } 
      if(eventCode === "workflow_event"){
        let workflowEvent = params.event["activitystreams:object"]["osgiEvent:properties"]["EventType"];
        logger.info("Workflow Event: "+workflowEvent);
        let eventApplication = params.event["activitystreams:object"]["osgiEvent:properties"]["event.application"];
        //Ignore if this is a WorkflowCompleted event but eventApplication is knownNotLocal since it is a duplicate
        if((typeof eventApplication != undefined) && (workflowEvent === "WorkflowCompleted") && (eventApplication === "knownNotLocal")){
          const response = {
            statusCode: 200,
            body: "Ignoring because WorkflowCompleted and eventApplication is knownNotLocal"
          };
          return response;
        }
        const assetUser = params.event["activitystreams:object"]["osgiEvent:properties"]["User"];
        logger.info("User Id: "+assetUser);
        const assetPath = params.event["activitystreams:object"]["osgiEvent:properties"]["payloadPath"];
        logger.info("Asset Path: "+assetPath);
        let workflowName = params.event["activitystreams:object"]["osgiEvent:properties"]["WorkflowName"];
        logger.info("Workflow Name: "+workflowName);
        let aemInstance = params.event["activitystreams:generator"]["xdmContentRepository:root"];
        logger.info("Asset Image Url: "+aemInstance + "assetdetails.html" + assetPath);
        let assetName = "asset";
       
        var str = assetPath;
        var n = str.lastIndexOf('/');
        assetName = str.substring(n + 1);

        let slackMessageBody = {
          "blocks": [
            {
              "type": "section",
              "text": {
                "type": "mrkdwn",
                "text": "Workflow (" + workflowName + ") : " + workflowEvent + " on <" + aemInstance + "assetdetails.html" + assetPath + "|"+assetName+"> by " + assetUser + " : <" + aemInstance + "aem/inbox|AEM Inbox>"
              },
              // "accessory": {
              //   "type": "image",
              //   "image_url": aemInstance.slice(0, -1) + assetPath,
              //   "alt_text": assetName
              // }
            }
          ]
        }
        //Make POST to Slack Webhook
        const res = await fetch(SLACK_WEBHOOK, {
          'method': 'POST',
          'headers': { 'Content-Type': 'application/json' },
          'body': JSON.stringify(slackMessageBody)
        });
        // if (!res.ok) {
        //   throw new Error('request to ' + SLACK_WEBHOOK + ' failed: ' + res.errorResponse)
        // }
        const response = {
          statusCode: 200,
          body: res
        };
  
        // log the response status code
        logger.info(`${response.statusCode}: successful request`);
        return response;
        
      }
      if((eventCode === "asset_created") || (eventCode === "asset_deleted") || (eventCode === "asset_updated")) {
        let eventType = "";

        if(eventCode === "asset_created"){
          eventType = "created";
        } 
        if(eventCode === "asset_deleted") {
          eventType = "deleted";
        }
        if(eventCode === "asset_updated"){
          eventType = "updated";
        }
        logger.info("Event Type: "+eventType);
  
        const assetUser = params.event["activitystreams:actor"]["@id"];
        logger.info("User Id: "+assetUser);
        const assetPath = params.event["activitystreams:object"]["xdmAsset:path"];
        logger.info("Asset Path: "+assetPath);
        let assetName = params.event["activitystreams:object"]["xdmAsset:asset_name"];
        logger.info("Asset Name: "+assetName);
        if(typeof assetName === 'undefined'){
          var str = assetPath;
          var n = str.lastIndexOf('/');
          assetName = str.substring(n + 1);
        } 
        let aemInstance = params.event["activitystreams:generator"]["xdmContentRepository:root"];
        logger.info("Asset Image Url: "+aemInstance + "assetdetails.html" + assetPath);
  
        let slackMessageBody = {
          "blocks": [
            {
              "type": "section",
              "text": {
                "type": "mrkdwn",
                "text": "<" + aemInstance + "assetdetails.html" + assetPath + "|"+assetName+"> " + eventType + " by " + assetUser
              },
              // "accessory": {
              //   "type": "image",
              //   "image_url": aemInstance.slice(0, -1) + assetPath,
              //   "alt_text": assetName
              // }
            }
          ]
        }
  
        //Make POST to Slack Webhook
        const res = await fetch(SLACK_WEBHOOK, {
          'method': 'POST',
          'headers': { 'Content-Type': 'application/json' },
          'body': JSON.stringify(slackMessageBody)
        });
        // if (!res.ok) {
        //   throw new Error('request to ' + SLACK_WEBHOOK + ' failed: ' + res.errorResponse)
        // }
        const response = {
          statusCode: 200,
          body: res
        };
  
        // log the response status code
        logger.info(`${response.statusCode}: successful request`);
        return response;
      }
    
  }
  } catch (error) {
    // log any server errors
    logger.error(error);
    // return with 500
    return errorResponse(500, 'server error:' + error, logger);
  }
}

exports.main = main
