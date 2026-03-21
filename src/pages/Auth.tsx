import { useState } from "react";
import { supabase } from "../lib/supabase";
import { useLocation } from "wouter";

export default function Auth() {
  const [, setLocation] = useLocation();

  const [isLogin, setIsLogin] = useState(true);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [loading, setLoading] = useState(false);

  const ensureUserAndArtistProfile = async (
    authUserId: string,
    userEmail: string
  ) => {
    const normalizedEmail = userEmail.trim().toLowerCase();

    const { data: existingUser, error: existingUserError } = await supabase
      .from("users")
      .select("id, email")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (existingUserError) {
      throw new Error(`Erreur lecture profil utilisateur: ${existingUserError.message}`);
    }

    let appUserId: number;

    if (existingUser) {
      appUserId = existingUser.id;
    } else {
      const { data: insertedUser, error: userInsertError } = await supabase
        .from("users")
        .insert([
          {
            email: normalizedEmail,
            openId: authUserId,
            name: normalizedEmail.split("@")[0],
            role: "user",
          },
        ])
        .select("id")
        .single();

      if (userInsertError) {
        throw new Error(`Erreur création profil utilisateur: ${userInsertError.message}`);
      }

      if (!insertedUser) {
        throw new Error("Création profil utilisateur impossible.");
      }

      appUserId = insertedUser.id;
    }

    const { data: existingArtist, error: existingArtistError } = await supabase
      .from("artists")
      .select("id")
      .eq("userId", appUserId)
      .maybeSingle();

    if (existingArtistError) {
      throw new Error(`Erreur lecture profil artiste: ${existingArtistError.message}`);
    }

    if (!existingArtist) {
      const { error: artistInsertError } = await supabase.from("artists").insert([
        {
          userId: appUserId,
          bio: "",
          commissionRate: 10,
          isVerified: false,
        },
      ]);

      if (artistInsertError) {
        throw new Error(`Erreur création profil artiste: ${artistInsertError.message}`);
      }
    }
  };

  const handleAuth = async () => {
    if (!email || !password) {
      alert("Email et mot de passe requis");
      return;
    }

    setLoading(true);

    try {
      const normalizedEmail = email.trim().toLowerCase();

      if (isLogin) {
        const { data: signInData, error } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });

        if (error) {
          alert(error.message);
          return;
        }

        const authUserId = signInData.user?.id;

        if (!authUserId) {
          alert("Utilisateur connecté introuvable.");
          return;
        }

        await ensureUserAndArtistProfile(authUserId, normalizedEmail);

        setLocation("/seller-dashboard");
        return;
      }

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
      });

      if (signUpError) {
        alert(signUpError.message);
        return;
      }

      const authUserId = signUpData.user?.id;

      if (!authUserId) {
        alert("Compte créé, mais utilisateur introuvable.");
        return;
      }

      const hasSession = !!signUpData.session;

      if (hasSession) {
        await ensureUserAndArtistProfile(authUserId, normalizedEmail);
        alert("Compte artiste créé avec succès. Vous pouvez maintenant vous connecter.");
      } else {
        alert(
          "Compte créé. Confirmez votre email puis connectez-vous. Le profil artiste sera finalisé automatiquement à la première connexion."
        );
      }

      setIsLogin(true);
      setPassword("");
    } catch (err: any) {
      console.error("Erreur auth:", err);
      alert(err.message || "Une erreur est survenue.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="bg-white p-8 rounded-xl border w-96">
        <h1 className="text-2xl font-bold mb-6 text-center">
          {isLogin ? "Connexion artiste" : "Inscription artiste"}
        </h1>

        <input
          className="w-full border p-2 mb-4 rounded"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          className="w-full border p-2 mb-6 rounded"
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={handleAuth}
          disabled={loading}
          className="w-full bg-amber-600 text-white py-2 rounded hover:bg-amber-700 disabled:opacity-60"
        >
          {loading ? "Chargement..." : isLogin ? "Se connecter" : "Créer un compte"}
        </button>

        <button
          onClick={() => setIsLogin(!isLogin)}
          disabled={loading}
          className="w-full mt-4 text-sm text-slate-600"
        >
          {isLogin ? "Créer un compte artiste" : "J'ai déjà un compte"}
        </button>
      </div>
    </div>
  );
}