const url = new URL(window.location.href);
const objId = url.searchParams.get('v');

const pageSize = 5;

const auth = firebase.auth();

const whenSignedIn = document.getElementById('whenSignedIn');
const whenSignedOut = document.getElementById('whenSignedOut');

const signInBtn = document.getElementById('signInBtn');
const signOutBtn = document.getElementById('signOutBtn');

const userDetails = document.getElementById('userDetails');

const provider = new firebase.auth.GoogleAuthProvider();

signInBtn.onclick = () => auth.signInWithPopup(provider);

signOutBtn.onclick = () => auth.signOut();

auth.onAuthStateChanged((user) => {
    if (user) {
        whenSignedIn.hidden = false;
        whenSignedOut.hidden = true;
        userDetails.innerHTML = `<h3>Hello ${user.displayName}!</h3> <p>User ID: ${user.uid}</p>`;
    }
    else {
        whenSignedIn.hidden = true;
        whenSignedOut.hidden = false;
        userDetails.innerHTML = '';
    }
});

const db = firebase.firestore();
let thingsRef = db.collection(objId);

let query = thingsRef
    .orderBy('createdAt', 'desc')
    .limit(pageSize);

const addComment = document.getElementById('addComment');
const thingsList = document.getElementById('thingsList');

/**
 * onClick of loadMoreComments DOM button is supposed to load older comments
 * A new comment added by current user will be shown to the current user using front-end code
 * Any new comment added by any user will obviously be updated at the backend
 * To load new comments by users other than current user, page has to be refreshed
 */
const loadMoreComments = document.getElementById('loadMoreComments');
loadMoreComments.onclick = (() => { printComments(query) });

// getCommentString() returns the string for each comment that has to be added to the list of comments DOM element
function getCommentString(name, msgContent) {
    return `<li>${"<b>" + name + "</b>: " + msgContent}</li>`;
}

printComments(query);

/**
 * printComments() takes in query, then does 2 things:
 * 1. Update client side DOM element to display newly loaded comments
 * 2. update onClick handler of loadMoreComments DOM button to load further <pageSize> number of comments
 */
function printComments(query) {
    query.get().then(function (querySnapshot) {
        // if no new queries found, return, as no point in updating onclick of loadMoreComments button
        if (querySnapshot.docs.length == 0) {
            return;
        }
        let lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1];
        console.log('lastVisible:', lastVisible);
        query = thingsRef
            .orderBy('createdAt', 'desc')
            .startAfter(lastVisible)
            .limit(pageSize);
        loadMoreComments.onclick = (() => { printComments(query) });
        const items = querySnapshot.docs.map(doc => {
            return getCommentString(doc.data().name, doc.data().msgContent);
        });
        thingsList.innerHTML += items.join('');
    });
}

/**
 * When user auth state changes, update onClick handler for addComment DOM button to add comment to database
 * and display the newly added comment to the current user
 */
auth.onAuthStateChanged((user) => {
    if (user) {
        addComment.onclick = () => {
            let msgContent = document.getElementById("msgContent");
            if (msgContent.value == "") {
                alert("Empty comment not allowed.");
                return;
            }
            thingsRef.add({
                uid: user.uid,
                name: user.displayName,
                msgContent: msgContent.value,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            })
            .then(() => {
                thingsList.innerHTML = getCommentString(user.displayName, msgContent.value) + thingsList.innerHTML;
                msgContent.value = "";
            })
            .catch(() => {
                console.error('Comment could not be added rn.');
            });
        }
    }
    else {
        addComment.onclick = () => {
            alert("You need to login to comment.");
        };
    }
});
