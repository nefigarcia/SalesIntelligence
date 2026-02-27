
'use client';

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { useToast } from '@/hooks/use-toast';
import { FirestorePermissionError } from '@/firebase/errors';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handleError = (error: any) => {
      // Log the detailed context to the console for manual checking
      if (error instanceof FirestorePermissionError) {
        console.group('🔥 Firebase Permission Error Details');
        console.log('Path:', error.context.path);
        console.log('Operation:', error.context.operation);
        if (error.context.requestResourceData) {
          console.log('Data being sent:', error.context.requestResourceData);
        }
        console.groupEnd();
      }

      toast({
        variant: "destructive",
        title: "Permission Denied",
        description: error.message || "You don't have permission to perform this action. Check the browser console for details.",
      });
    };

    errorEmitter.on('permission-error', handleError);
    return () => errorEmitter.off('permission-error', handleError);
  }, [toast]);

  return null;
}
