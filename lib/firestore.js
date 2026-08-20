import {
  collection,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';

function getCollectionRef(userId, collectionName) {
  return collection(db, 'users', userId, collectionName);
}

function getDocRef(userId, collectionName, docId) {
  return doc(db, 'users', userId, collectionName, docId);
}

export async function addDocument(userId, collectionName, data) {
  const colRef = getCollectionRef(userId, collectionName);
  const docRef = await addDoc(colRef, {
    ...data,
    createdAt: new Date().toISOString(),
  });
  return docRef.id;
}

export async function setDocument(userId, collectionName, id, data) {
  const docRef = getDocRef(userId, collectionName, id);
  await setDoc(docRef, {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

export async function updateDocument(userId, collectionName, id, data) {
  const docRef = getDocRef(userId, collectionName, id);
  await updateDoc(docRef, {
    ...data,
    updatedAt: new Date().toISOString(),
  });
}

export async function deleteDocument(userId, collectionName, id) {
  const docRef = getDocRef(userId, collectionName, id);
  await deleteDoc(docRef);
}

export async function getDocuments(userId, collectionName) {
  const colRef = getCollectionRef(userId, collectionName);
  const snapshot = await getDocs(colRef);
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}
