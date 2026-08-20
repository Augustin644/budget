'use client';
import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  query,
  orderBy
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './useAuth';
import { sanitizeTimestamps } from '@/utils/sanitize';

export function useCollection(collectionName, options = {}) {
  const { user } = useAuth();
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const collectionPath = user ? `users/${user.uid}/${collectionName}` : null;

  useEffect(() => {
    if (!collectionPath) return;

    let q;
    if (options.orderBy) {
      q = query(collection(db, collectionPath), orderBy(options.orderBy, options.orderDir || 'asc'));
    } else {
      q = collection(db, collectionPath);
    }

    setLoading(true); // eslint-disable-line react-hooks/set-state-in-effect
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const items = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...sanitizeTimestamps(doc.data()),
        }));
        setData(items);
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionPath, options.orderBy, options.orderDir]);

  const add = useCallback(
    async (item) => {
      if (!collectionPath) return;
      const now = new Date().toISOString();
      return addDoc(collection(db, collectionPath), {
        ...item,
        createdAt: now,
        updatedAt: now,
      });
    },
    [collectionPath]
  );

  const update = useCallback(
    async (id, updates) => {
      if (!collectionPath) return;
      const now = new Date().toISOString();
      return updateDoc(doc(db, collectionPath, id), {
        ...updates,
        updatedAt: now,
      });
    },
    [collectionPath]
  );

  const remove = useCallback(
    async (id) => {
      if (!collectionPath) return;
      return deleteDoc(doc(db, collectionPath, id));
    },
    [collectionPath]
  );

  const addBatch = useCallback(
    async (items) => {
      if (!collectionPath) return;
      const now = new Date().toISOString();
      const { writeBatch } = await import('firebase/firestore');
      const chunks = [];
      for (let i = 0; i < items.length; i += 500) {
        chunks.push(items.slice(i, i + 500));
      }
      for (const chunk of chunks) {
        const batch = writeBatch(db);
        for (const item of chunk) {
          const docRef = item.id
            ? doc(db, collectionPath, item.id)
            : doc(collection(db, collectionPath));
          batch.set(docRef, {
            ...item,
            createdAt: now,
            updatedAt: now,
          });
        }
        await batch.commit();
      }
    },
    [collectionPath]
  );

  return { data, loading, error, add, update, remove, addBatch };
}
