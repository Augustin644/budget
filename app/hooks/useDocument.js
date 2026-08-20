'use client';
import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from './useAuth';
import { sanitizeTimestamps } from '@/utils/sanitize';

export function useDocument(collectionName, documentId) {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const docPath = user && documentId ? `users/${user.uid}/${collectionName}/${documentId}` : null;

  useEffect(() => {
    if (!docPath) return;

    setLoading(true); // eslint-disable-line react-hooks/set-state-in-effect
    const unsubscribe = onSnapshot(
      doc(db, docPath),
      (snapshot) => {
        if (snapshot.exists()) {
          setData({ id: snapshot.id, ...sanitizeTimestamps(snapshot.data()) });
        } else {
          setData(null);
        }
        setLoading(false);
        setError(null);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [docPath]);

  const set = useCallback(
    async (data) => {
      if (!docPath) return;
      const now = new Date().toISOString();
      await setDoc(doc(db, docPath), { ...data, createdAt: now, updatedAt: now });
    },
    [docPath]
  );

  const update = useCallback(
    async (updates) => {
      if (!docPath) return;
      const now = new Date().toISOString();
      await updateDoc(doc(db, docPath), { ...updates, updatedAt: now });
    },
    [docPath]
  );

  const remove = useCallback(async () => {
    if (!docPath) return;
    await deleteDoc(doc(db, docPath));
  }, [docPath]);

  return { data, loading, error, set, update, remove };
}
