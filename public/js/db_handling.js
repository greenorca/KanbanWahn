var db;

function editItem(){
  var node = event.target;
  while (!node.classList.contains('kanban-task')){
    node = node.parentNode;
  }
  if (node.data_id){
    db.collection("items").doc(node.data_id)
      .get()
      .then(function(doc){
        if (doc.exists){
          node.classList.add('is-edit-item');
          openEditView(doc);
        }
      });
    }
  else {
    alert("node without data_id: "+node);
  }
}

function openEditView(doc){
  var dialog = document.createElement('div');
  dialog.id='dialog';
  var lbl_headline = document.createElement('label');
  lbl_headline.for = "txt_headline";
  lbl_headline.innerHTML ="Headline";
  dialog.append(lbl_headline);
  var txt_headline = document.createElement('input');
  txt_headline.id = "txt_headline";

  dialog.append(txt_headline);
  dialog.append(document.createElement('br'));
  dialog.append(document.createElement('br'));

  var lbl_description = document.createElement('label');
  lbl_description.for="txt_description";
  lbl_description.classList.add('for-textarea');
  lbl_description.innerHTML ="Description";
  dialog.append(lbl_description);
  var txt_description = document.createElement('textarea');
  txt_description.id = "txt_description";

  dialog.append(txt_description);
  dialog.append(document.createElement('br'));

  if (doc.id){
    dialog.data_id = doc.id;
    txt_headline.value = doc.data().headline;
    txt_description.innerHTML = doc.data().description.replace(/<br\s*\/?>/gi,'\r\n');
  }

  var btn_bar = document.createElement('div');
  btn_bar.classList.add("buttonbar");

  var btn_cancel = makeDialogButton("Cancel",function(){
    var items = document.getElementsByClassName('is-edit-item');
    for (var i=0; i < items.length; i++){
      items[i].classList.remove('is-edit-item');
    };
    document.getElementById('dialog').remove();
  });
  btn_bar.append(btn_cancel);

  var btn_delete = makeDialogButton("Delete", function(){
    removeItem();
    document.getElementById('dialog').remove();
  });
  btn_bar.append(btn_delete);


  var btn_save = makeDialogButton("Save", function(){
    saveItem();
    document.getElementById('dialog').remove();
  });
  btn_bar.append(btn_save);
  dialog.append(btn_bar);

  document.body.append(dialog);

}

function handleDialogKeyPress(){
  if (document.getElementById('dialog')){
    if(event.ctrlKey && event.keyCode == 's'){
      //save
      saveItem();
      document.getElementById('dialog').remove();
    }
    else {
      if (event.keyCode == 27){ //ESC
        var items = document.getElementsByClassName('is-edit-item');
        for (var i=0; i < items.length; i++){
          items[i].classList.remove('is-edit-item');
        };
        document.getElementById('dialog').remove();
      }
    }
  }
}

function makeDialogButton(btnName, btnFun){
  var button = document.createElement('button');
  button.innerHTML = btnName;
  btn_classes = ["mdl-button","mdl-js-button","mdl-button--raised"];
  btn_classes.forEach(function(item){
    button.classList.add(item);
  });
  button.addEventListener('click', btnFun, false);
  return button;
}

function removeItem(){
  var dialog = document.getElementById('dialog');
  if (dialog.data_id){
    return db.collection('items').doc(dialog.data_id).delete()
    .then(function() {
      console.log("Document successfully deleted!");
      var items = document.getElementsByClassName('is-edit-item');
      for (var i=0; i < items.length; i++){
        items[i].remove();
      };
    })
    .catch(function(error) {
      console.error("Error removing document: ", error);
    });
  }
}

function saveItem(){
  var dialog = document.getElementById('dialog');
  var item = {};
  item.headline = document.getElementById('txt_headline').value;
  item.description = document.getElementById('txt_description').value.replace(/(?:\r\n|\r|\n)/g, '<br>');
  if (dialog.data_id){
    return db.collection('items').doc(dialog.data_id).update({
      headline: item.headline,
      description: item.description,
      lastUpdate: Date.now()
    })
    .then(function(doc) {
      console.log("Document successfully updated remotely!");
      var items = document.getElementsByClassName('is-edit-item');
      for (var i=0; i < items.length; i++){
        if (items[i].data_id==dialog.data_id){
            items[i].parentNode.removeChild(items[i]);
            db.collection('items').doc(dialog.data_id)
              .get()
              .then(function(doc){
                insertTaskItem(doc);
              });
        }

      };
    })
    .catch(function(error) {
        // The document probably doesn't exist.
        console.error("Error updating document: ", error);
    });
  }
  else {
    item.state = "todo";
    item.user = firebase.auth().W; // wääh
    db.collection('items').add(item)
      .then(function(docRef){
        db.collection('items').doc(docRef.id)
          .get()
          .then(function(doc){
            insertTaskItem(doc);
          });
      })
      .catch(function(error){
        console.error("Error adding document: ", error);
      });
  }
}

function loadItemsForState(state){
  var node = document.getElementById(state+"-tasks");
  if (node){
    while (node.hasChildNodes()){
      node.removeChild(node.lastChild);
    }
  }
  db.collection("items").where('user','==',firebase.auth().currentUser.uid)
    .where('state','==', state)
    .get()
    .then((querySnapshot) => {
      querySnapshot.forEach((doc) => {
        console.log(`${doc.id} => ${doc.data().headline}`);
        insertTaskItem(doc);
      });
  });
}

function loadItems(){
  if (firebase.auth().currentUser){
    ["todo","inprogress","done"].forEach(function(state){
      loadItemsForState(state);
    });
  }
}

function insertTaskItem(doc){
  var card = document.createElement("div");
  card.classList.add("kanban-task");
  card.data_id = doc.id;
  var card_headline = document.createElement("h5");
  card_headline.innerHTML = doc.data().headline
  card.append(card_headline);
  var description = document.createElement("p");
  description.classList.add("task-description");
  description.innerHTML = doc.data().description.replace(/(?:\r\n|\r|\n)/g, '<br>');
  card.append(description);
  var lastUpdate = document.createElement("p");
  lastUpdate.classList.add("task-lastUpdate");

  if (typeof doc.data().lastUpdate !== 'undefined') {
    var d = new Date(doc.data().lastUpdate);
    lastUpdate.innerHTML = "<b>Last Update: </b>"+d.getFullYear()+"-"+d.getMonth()+"-"+d.getDate();
    card.append(lastUpdate);
  }

  if (doc.data().state){
    document.getElementById(doc.data().state+"-tasks").append(card);
    card.draggable = "true";
    card.addEventListener("click", function(){
      editItem();
    }, false);
    card.addEventListener('dragstart', dragStart);
    card.addEventListener('touchstart', dragStart);
    card.addEventListener('touchmove', dragOverFunction);
    //card.addEventListener('touchend', touchEnd);
  }
  else{
    console.log("missing item status "+doc.data())
  }
}

function dragStart(){
  var node = document.getElementById("imdragged");
  if (node){
    node.removeAttribute('id');
  }
  var node = event.target;
  while (!node.classList.contains('kanban-task')){
    node = node.parentNode;
  }
  node.id="imdragged";
  if (event.dataTransfer){
    event.dataTransfer.setData("text", event.target.data_id);
    //ev.dataTransfer.setData("current_state", event.target.parentNode.id);
  }
}

function dragOverFunction(ev){
  ev.preventDefault();
}

function dropFunction(ev){
    ev.preventDefault();
    var node = document.getElementById("imdragged");
    console.log("Received element" + node);
    var targetNode = event.target;
    var validDropIds = ["todo-tasks", "inprogress-tasks", "done-tasks", "long-done-tasks"];
    while (validDropIds.indexOf(targetNode.id) < 0){
      targetNode = targetNode.parentNode;
    }
    if (targetNode){
      var oldParent = node.parentNode;
      oldParent.removeChild(node);
      targetNode.append(node);
      db.collection('items').doc(node.data_id)
        .update({
            state: targetNode.id.replace('-tasks',''),
            lastUpdate: Date.now()
        })
        .then(function() {
        console.log("Document successfully updated!");
        })
        .catch(function(error) {
            // The document probably doesn't exist.
            console.error("Error updating document: ", error);
        });
    }
}

function touchEnd(){
  event.preventDefault();
  var node = document.getElementById("imdragged");
  node.removeAttribute('id');
  console.log("Received element" + node);

  var changedTouch = event.changedTouches[0];
  var targetNode = document.elementFromPoint(changedTouch.clientX, changedTouch.clientY);

  var validDropIds = ["todo-tasks", "inprogress-tasks", "done-tasks","long-done-tasks"];
  while (validDropIds.indexOf(targetNode.id) < 0){
    targetNode = targetNode.parentNode;
  }
  if (targetNode){
    var oldParent = node.parentNode;

    if (oldParent == targetNode){
      editItem(node);
      return;
    }

    oldParent.removeChild(node);
    targetNode.append(node);
    db.collection('items').doc(node.data_id)
      .update({
          state: targetNode.id.replace('-tasks',''),
          lastUpdate: Date.now()
      })
      .then(function() {
      console.log("Document successfully updated!");
      })
      .catch(function(error) {
          // The document probably doesn't exist.
          console.error("Error updating document: ", error);
      });
  }
}

window.addEventListener("load",function(){
  db = firebase.firestore();

  db.settings({
    cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED
  });

  db.enablePersistence();

  //setup event listeners for drop-targets
  var dropElements = document.getElementsByClassName('kanban-tasklist');
  for (var i=0; i < dropElements.length; i++){
    var elem =dropElements[i];
    elem.addEventListener('drop', function(){
        dropFunction(event);
      }, false);
    elem.addEventListener('dragover', function(){
        dragOverFunction(event);
      }, false);
    elem.addEventListener('touchend', touchEnd);
  }

  document.getElementById('load-btn').addEventListener('click', function(){
    loadItemsForState("long-done");
  });

  // add CTRL+S and ESC shortcuts
  document.addEventListener('keyup', handleDialogKeyPress);


});
