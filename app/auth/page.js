'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@/app/components/ui/Card';
import Button from '@/app/components/ui/Button';
import Input from '@/app/components/ui/Input';
import { signIn, signUp } from '@/lib/auth';

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await signIn(email, password);
      } else {
        await signUp(email, password);
      }
      router.push('/dashboard');
    } catch (err) {
      let message = 'Une erreur est survenue';
      if (err.code === 'auth/user-not-found') message = 'Aucun compte trouvé avec cet email';
      else if (err.code === 'auth/wrong-password') message = 'Mot de passe incorrect';
      else if (err.code === 'auth/email-already-in-use') message = 'Cet email est déjà utilisé';
      else if (err.code === 'auth/weak-password') message = 'Le mot de passe doit contenir au moins 6 caractères';
      else if (err.code === 'auth/invalid-email') message = 'Email invalide';
      else if (err.message) message = err.message;
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <div className="text-center mb-6">
          <span className="text-4xl block mb-3">💰</span>
          <h1 className="text-xl font-bold text-white">Budget App</h1>
          <p className="text-sm text-gray-400 mt-1">Suivi financier personnel</p>
        </div>

        <div className="flex rounded-lg overflow-hidden border border-[#1F2937] mb-6">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-2 text-sm ${isLogin ? 'bg-[#39F6D6] text-[#0B0F1A] font-medium' : 'bg-[#111827] text-gray-400'}`}
          >
            Connexion
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-2 text-sm ${!isLogin ? 'bg-[#39F6D6] text-[#0B0F1A] font-medium' : 'bg-[#111827] text-gray-400'}`}
          >
            Inscription
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="votre@email.com"
            required
          />
          <Input
            label="Mot de passe"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            required
          />

          {error && (
            <p className="text-sm text-red-400">{error}</p>
          )}

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Chargement...' : isLogin ? 'Se connecter' : "S'inscrire"}
          </Button>
        </form>
      </Card>
    </div>
  );
}
