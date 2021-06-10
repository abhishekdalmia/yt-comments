import React, { useEffect, useRef, useState } from 'react';
import ReactDOM from 'react-dom';

import _ from 'lodash';

import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css';

import firebase from 'firebase';
import { useAuthState } from 'react-firebase-hooks/auth';

var firebaseConfig = {
    apiKey: "AIzaSyBuIbD1mv4PzxvKJHg0CWJRLvs__N8jOVc",
    authDomain: "savage-165eb.firebaseapp.com",
    projectId: "savage-165eb",
    storageBucket: "savage-165eb.appspot.com",
    messagingSenderId: "697387341124",
    appId: "1:697387341124:web:e5d9a46a8d23257f5db311",
    measurementId: "G-T0TZ7N43Q3"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);

const url = new URL(window.location.href);
const objId = url.searchParams.get('v');
const auth = firebase.auth();
const firestore = firebase.firestore();
let thingsRef = firestore.collection(objId);

const commentPageSize = 25;
const replyPageSize = 5;

function Page() {
    const [user] = useAuthState(auth);
    return (
        <div className="Page">
            <header class="column" style={{display: 'flex',  justifyContent:'center', alignItems:'center', height: '100vh', backgroundColor: 'orange'}}>
                <div class="wrapper">
                    <h1>YouTube Comments</h1>
                    <SignOut />
                </div>
            </header>
            <section style={{float: 'left'}}></section>
            <section class="column" style={{display: 'flex',  justifyContent:'center', alignItems:'center', height: '100vh', backgroundColor: 'green'}}>
                {user ? <CommentList /> : <SignIn />}
            </section>
        </div>
    );
}

function SignIn() {
    const signInWithGoogle = () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        auth.signInWithPopup(provider);
    }
    return (
        <>
            <button className="sign-in" onClick={signInWithGoogle}>Sign in with Google</button>
        </>
    );
}

function SignOut() {
    return auth.currentUser && (
        <button className="sign-out" onClick={() => auth.signOut()}>Sign Out</button>
    );
}

function CommentList() {
    // dummy ref to scroll to bottom when new comments loaded, and to top when new comment created
    const dummyTop = useRef();
    const dummyBottom = useRef();
    const [comments, setComments] = useState([]);
    const lastVisible = useRef();
    useEffect(() => {
        const fetchData = async () => {
            const data = await thingsRef
                .orderBy('createdAt', 'desc')
                .limit(commentPageSize)
                .get();
            if (data.docs.length === 0) {
                return;
            }
            setComments(data.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
            lastVisible.current = data.docs[data.docs.length - 1];
        };
        fetchData();
    }, []);

    function fetchNext() {
        if (lastVisible.current == null) {
            return;
        };
        const fetchNextData = async () => {
            const data = await thingsRef
                .orderBy('createdAt', 'desc')
                .limit(commentPageSize)
                .startAfter(lastVisible.current)
                .get();
            if (data.docs.length === 0) {
                return;
            }
            setComments(comments.concat(data.docs.map((doc) => ({ ...doc.data(), id: doc.id }))));
            lastVisible.current = data.docs[data.docs.length - 1];
            dummyBottom.current.scrollIntoView({ behavior: 'smooth' });
        };
        fetchNextData();
    }

    const [formValue, setFormValue] = useState('');
    const sendComment = async (e) => {
        e.preventDefault();
        const { uid, displayName } = auth.currentUser;
        const newDocRef = await thingsRef.add({
            uid: uid,
            name: displayName,
            msgContent: formValue,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        const newDoc = await thingsRef.doc(newDocRef.id).get();
        setComments([{ ...newDoc.data(), id: newDoc.id }].concat(comments));
        setFormValue('');
        dummyTop.current.scrollIntoView({ behavior: 'smooth' });
    }

    function deleteComment(commentId) {
        // check if the comment to be deleted is empty or not
        thingsRef.doc(commentId).get()
            .then((commentRef) => {
                if (commentRef.exists) {
                    thingsRef.doc(commentId).collection('replies').limit(1).get()
                        .then((replies) => {
                            if (replies.docs.length === 1) {
                                thingsRef.doc(commentId).update({ uid: null, name: null, msgContent: "<deleted comment>" })
                                    .then(() => {
                                        const temp = [...comments];
                                        const tempIndex = temp.findIndex(item => item.id === commentId);
                                        temp[tempIndex] = { ...temp[tempIndex], uid: null, name: null, msgContent: "<deleted comment>" };
                                        setComments(temp);
                                    })
                                    .catch((error) => {
                                        console.error(error);
                                    });
                            }
                            else {
                                // no replies to this comment exist, so completely remove it from the db
                                // thingsRef.doc(commentId.current).collection('replies').doc(replyId).delete()
                                thingsRef.doc(commentId).delete()
                                    .then(() => {
                                        // remove current comment component from comments array
                                        let temp = [...comments];
                                        temp.splice(temp.findIndex(item => item.id === commentId), 1);
                                        setComments(temp);
                                    })
                                    .catch((error) => {
                                        console.error(error);
                                    });
                            }
                        })
                        .catch((error) => {
                            console.error(error);
                        });
                }
            })
            .catch((error) => {
                console.error(error);
            });
    }

    // if comments exist, display them using <Component /> component
    if (comments) {
        return (
            <>
                <div class="wrapper">
                <span ref={dummyTop}></span>
                <main>
                    <h6>successfully logged in</h6>
                    <ul>
                        {
                            comments.map(comment => (
                                <li key={comment.id}> <Comment value={comment} />
                                    {(auth && auth.currentUser && (auth.currentUser.uid === comment.uid)) ? <button onClick={() => deleteComment(comment.id)} className="btn btn-danger">Delete comment</button> : <></>}
                                </li>
                            ))
                        }
                    </ul>
                    <button onClick={() => {
                        fetchNext();
                    }}>Load more comments.</button>
                </main>
                <form onSubmit={sendComment}>
                    <input value={formValue} onChange={(e) => setFormValue(e.target.value)} placeholder="say something nice" />
                    <button type="submit" disabled={!formValue}>🕊️</button>
                </form>
                <span ref={dummyBottom}></span>
                </div>
            </>
        );
    }
    // if comments do not exist, return empty string
    return ('');
}

function Comment(props) {
    const { name, msgContent } = props.value;
    return (
        <>
            <b>{name}</b>{": "}{msgContent}
            <br />
            <ReplyList value={_.pick(props.value, ['id'])} />
            <br />
        </>
    );
}

function ReplyList(props) {
    // dummy ref to scroll to bottom when new replies loaded, and to top when new reply created
    const dummyTop = useRef();
    const dummyBottom = useRef();
    const [replies, setReplies] = useState([]);
    const lastVisible = useRef();
    const commentId = useRef();
    const firstTimeLoaded = useRef();
    commentId.current = props.value.id;

    useEffect(() => {
        firstTimeLoaded.current = true;
    }, []);

    function fetchNext() {
        if (firstTimeLoaded.current === true) {
            const fetchData = async () => {
                const data = await thingsRef.doc(commentId.current).collection('replies')
                    .orderBy('createdAt', 'desc')
                    .limit(replyPageSize)
                    .get();
                if (data.docs.length === 0) {
                    return;
                }
                setReplies(data.docs.map((doc) => ({ ...doc.data(), id: doc.id })));
                lastVisible.current = data.docs[data.docs.length - 1];
                firstTimeLoaded.current = false;
            }
            fetchData();
            return;
        }
        if (lastVisible.current == null) {
            return;
        };
        const fetchNextData = async () => {
            const data = await thingsRef.doc(commentId.current).collection('replies')
                .orderBy('createdAt', 'desc')
                .limit(replyPageSize)
                .startAfter(lastVisible.current)
                .get();
            if (data.docs.length === 0) {
                return;
            }
            setReplies(replies.concat(data.docs.map((doc) => ({ ...doc.data(), id: doc.id }))));
            lastVisible.current = data.docs[data.docs.length - 1];
            dummyBottom.current.scrollIntoView({ behavior: 'smooth', block: "end", inline: "nearest" });
        };
        fetchNextData();
    }

    const [formValue, setFormValue] = useState('');
    const sendReply = async (e) => {
        e.preventDefault();
        const { uid, displayName } = auth.currentUser;
        const newDocRef = await thingsRef.doc(props.value.id).collection("replies").add({
            uid: uid,
            name: displayName,
            msgContent: formValue,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });
        const newDoc = await thingsRef.doc(commentId.current).collection('replies').doc(newDocRef.id).get();
        setReplies([{ ...newDoc.data(), id: newDoc.id }].concat(replies));
        setFormValue('');
        dummyTop.current.scrollIntoView({ behavior: 'smooth', block: "start", inline: "nearest" });
        setFormValue('');
    }

    function deleteReply(replyId) {
        thingsRef.doc(commentId.current).collection('replies').doc(replyId).delete()
            .then(() => {
                let temp = [...replies];
                temp.splice(temp.findIndex(item => item.id === replyId), 1);
                setReplies(temp);
            })
            .catch((error) => {
                console.error(error);
            });
    }

    // if replies exist, display them using <Reply /> component
    if (replies) {
        return (
            <>
                <span ref={dummyTop}></span>
                <main>
                    <ul>
                        {
                            replies.map(reply => (
                                <li key={reply.id}>
                                    <Reply value={reply} />
                                    <br />
                                    {(auth && auth.currentUser && (auth.currentUser.uid === reply.uid)) ? <button onClick={() => deleteReply(reply.id)} className="btn btn-danger">Delete reply</button> : <></>}
                                </li>
                            ))
                        }
                    </ul>
                    <button onClick={() => {
                        fetchNext();
                    }}>
                        {(replies.length === 0) ? "Load replies" : "Load more replies"}
                    </button>
                </main>
                <form onSubmit={sendReply}>
                    <input value={formValue} onChange={(e) => setFormValue(e.target.value)} placeholder="say something nice" />
                    <button type="submit" disabled={!formValue}>🕊️</button>
                </form>
                <span ref={dummyBottom}></span>
            </>
        );
    }
    // if replies do not exist, return empty string
    return ('');
}

function Reply(props) {
    const { name, msgContent } = props.value;
    return (
        <>
            <b>{name}</b>{": "}{msgContent}
        </>
    )
}



// ========================================

ReactDOM.render(
    <Page />,
    document.getElementById('root')
);