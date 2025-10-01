import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState
} from 'react';
import supabase from '../../services/supabaseClient';
import authService from '../../services/authService';
import AuthModal from './AuthModal.jsx';

const SupabaseAuthContext = createContext(null);

const decorateUser = (user) => {
  if (!user) return null;
  const metadata = (typeof user.user_metadata === 'object' && user.user_metadata) || {};
  return {
    ...user,
    name: metadata.full_name || metadata.name || user.email?.split('@')[0] || 'User',
    picture: metadata.avatar_url || metadata.picture || null
  };
};

export const SupabaseAuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [rawUser, setRawUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastError, setLastError] = useState(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalConfig, setAuthModalConfig] = useState({
    initialEmail: '',
    initialMode: 'signIn',
    redirectTo: null
  });
  const pendingAuthPromiseRef = useRef(null);

  const syncAuthContext = useCallback((nextSession) => {
    const nextUser = nextSession?.user ?? null;
    setSession(nextSession ?? null);
    setRawUser(nextUser);
    authService.updateAuthContext({ session: nextSession ?? null, user: nextUser });
  }, []);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (error) {
          console.error('Supabase session init failed', error);
          setLastError(error);
        }

        syncAuthContext(data?.session ?? null);
      } catch (error) {
        if (!isMounted) return;
        console.error('Supabase session init error', error);
        setLastError(error);
        syncAuthContext(null);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    bootstrap();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return;
      syncAuthContext(nextSession ?? null);
      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      authListener?.subscription?.unsubscribe();
    };
  }, [syncAuthContext]);

  const user = useMemo(() => decorateUser(rawUser), [rawUser]);

  const profile = useMemo(() => {
    if (!rawUser) return null;
    const metadata = (typeof rawUser.user_metadata === 'object' && rawUser.user_metadata) || {};
    return {
      id: rawUser.id,
      email: rawUser.email,
      fullName: user?.name || rawUser.email,
      avatarUrl: user?.picture || null,
      metadata
    };
  }, [rawUser, user]);

  const signInWithEmail = useCallback(async (email, { redirectTo } = {}) => {
    const targetEmail = email?.trim();
    if (!targetEmail) {
      throw new Error('Email is required for email sign-in');
    }
    const { error } = await supabase.auth.signInWithOtp({
      email: targetEmail,
      options: {
        emailRedirectTo: redirectTo || window.location.origin
      }
    });

    if (error) {
      throw error;
    }
    return { email: targetEmail };
  }, []);

  const signUpWithPassword = useCallback(
    async (email, password, { redirectTo } = {}) => {
      const targetEmail = email?.trim();
      if (!targetEmail) {
        throw new Error('Email is required for sign-up');
      }
      if (!password) {
        throw new Error('Password is required for sign-up');
      }

      const { data, error } = await supabase.auth.signUp({
        email: targetEmail,
        password,
        options: {
          emailRedirectTo: redirectTo || window.location.origin
        }
      });

      if (error) {
        throw error;
      }

      if (data?.session) {
        syncAuthContext(data.session);
      }

      return data;
    },
    [syncAuthContext]
  );

  const signInWithPassword = useCallback(
    async (email, password) => {
      const targetEmail = email?.trim();
      if (!targetEmail) {
        throw new Error('Email is required for password sign-in');
      }
      if (!password) {
        throw new Error('Password is required for password sign-in');
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email: targetEmail,
        password
      });

      if (error) {
        throw error;
      }

      if (data?.session) {
        syncAuthContext(data.session);
      }

      return data;
    },
    [syncAuthContext]
  );

  const sendPasswordReset = useCallback(async (email, { redirectTo } = {}) => {
    const targetEmail = email?.trim();
    if (!targetEmail) {
      throw new Error('Email is required for password reset');
    }

    const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
      redirectTo: redirectTo || window.location.origin
    });

    if (error) {
      throw error;
    }

    return { email: targetEmail };
  }, []);

  const completeAuthModal = useCallback((result) => {
    pendingAuthPromiseRef.current?.resolve?.(result || {});
    pendingAuthPromiseRef.current = null;
    setIsAuthModalOpen(false);
  }, []);

  const closeAuthModal = useCallback(() => {
    completeAuthModal({ cancelled: true });
  }, [completeAuthModal]);

  const signIn = useCallback(({ email, redirectTo, mode } = {}) => {
    if (pendingAuthPromiseRef.current?.resolve) {
      pendingAuthPromiseRef.current.resolve({ cancelled: true });
    }

    setAuthModalConfig({
      initialEmail: email?.trim() || '',
      initialMode: mode === 'signUp' || mode === 'signup' ? 'signUp' : 'signIn',
      redirectTo: redirectTo || window.location.origin
    });
    setIsAuthModalOpen(true);

    return new Promise((resolve) => {
      pendingAuthPromiseRef.current = { resolve };
    });
  }, []);

  useEffect(() => () => {
    if (pendingAuthPromiseRef.current?.resolve) {
      pendingAuthPromiseRef.current.resolve({ cancelled: true });
    }
  }, []);

  const signInWithOAuth = useCallback(async (provider, { redirectTo } = {}) => {
    if (!provider) throw new Error('Provider is required for OAuth sign-in');
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectTo || window.location.origin
      }
    });

    if (error) {
      throw error;
    }
  }, []);

  const signOut = useCallback(async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  }, []);

  const refreshSession = useCallback(async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error) throw error;
    syncAuthContext(data?.session ?? null);
  }, [syncAuthContext]);

  useEffect(() => {
    if (!rawUser) {
      return;
    }

    let cancelled = false;

    const sync = async () => {
      try {
        await authService.syncUserWithSupabase(rawUser);
      } catch (error) {
        if (!cancelled) {
          console.error('Failed to sync Supabase user with auth management backend', error);
        }
      }
    };

    sync();

    return () => {
      cancelled = true;
    };
  }, [rawUser]);

  const value = useMemo(
    () => ({
      session,
      user,
      rawUser,
      profile,
      isAuthenticated: !!user,
      isLoading,
      lastError,
      signIn,
      signInWithEmail,
      signInWithPassword,
      signUpWithPassword,
      sendPasswordReset,
      signInWithOAuth,
      signOut,
      refreshSession
    }),
    [
      session,
      user,
      rawUser,
      profile,
      isLoading,
      lastError,
      signIn,
      signInWithEmail,
      signInWithPassword,
      signUpWithPassword,
      sendPasswordReset,
      signInWithOAuth,
      signOut,
      refreshSession
    ]
  );

  return (
    <SupabaseAuthContext.Provider value={value}>
      {children}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={closeAuthModal}
        onComplete={completeAuthModal}
        signInWithPassword={signInWithPassword}
        signUpWithPassword={signUpWithPassword}
        sendPasswordReset={sendPasswordReset}
        signInWithOAuth={signInWithOAuth}
        signInWithMagicLink={signInWithEmail}
        allowMagicLink={false}
        initialEmail={authModalConfig.initialEmail}
        initialMode={authModalConfig.initialMode}
        redirectTo={authModalConfig.redirectTo || window.location.origin}
      />
    </SupabaseAuthContext.Provider>
  );
};

export const useSupabaseAuth = () => {
  const context = useContext(SupabaseAuthContext);
  if (!context) {
    throw new Error('useSupabaseAuth must be used within SupabaseAuthProvider');
  }
  return context;
};

export default SupabaseAuthProvider;
