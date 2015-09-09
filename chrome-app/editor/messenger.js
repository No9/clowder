    var messageHandler = function(event) {

      console.log('Message received fom APP!');

      try {
        event.source.postMessage("Message from webpage", "*");
        console.log('message send back to get catched by webview');
      } catch(error) {
        console.log("Error on postMessage back to APP" + error);
      }

    };
    window.addEventListener('message', messageHandler, false);