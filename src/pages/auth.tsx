import { FormEvent, useState } from "react";
import { useLocation } from "wouter";
import { Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useLogin, useRegister } from "@/api-client";

export default function AuthPage() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = (event: FormEvent) => {
    event.preventDefault();
    loginMutation.mutate({ username: loginUsername, password: loginPassword }, {
      onSuccess: () => {
        toast({ title: "Logged in", description: "Welcome back to Goal Edge." });
        setLocation("/");
      },
      onError: (error) => toast({ title: "Login failed", description: error instanceof Error ? error.message : "Check your credentials.", variant: "destructive" }),
    });
  };

  const handleRegister = (event: FormEvent) => {
    event.preventDefault();
    registerMutation.mutate({ username, email, password }, {
      onSuccess: () => {
        toast({ title: "Account created", description: "Now log in with your new account." });
        setLoginUsername(username);
        setLoginPassword(password);
      },
      onError: (error) => toast({ title: "Registration failed", description: error instanceof Error ? error.message : "Try a different username or email.", variant: "destructive" }),
    });
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md border-border shadow-xl">
        <CardHeader className="text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
            <Target className="h-7 w-7 text-primary" />
          </div>
          <div>
            <CardTitle className="text-2xl font-black tracking-tight uppercase">GOAL<span className="text-primary">EDGE</span></CardTitle>
            <CardDescription>Full-stack soccer analytics dashboard</CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login">
            <TabsList className="grid w-full grid-cols-2 mb-5">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="register">Register</TabsTrigger>
            </TabsList>
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label>Username or email</Label>
                  <Input value={loginUsername} onChange={(e) => setLoginUsername(e.target.value)} placeholder="your username or email" />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input type="password" value={loginPassword} onChange={(e) => setLoginPassword(e.target.value)} placeholder="your password" />
                </div>
                <Button type="submit" className="w-full" disabled={loginMutation.isPending}>{loginMutation.isPending ? "Logging in..." : "Login"}</Button>
                <p className="text-xs text-muted-foreground text-center font-mono">Register first, then log in.</p>
              </form>
            </TabsContent>
            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-2">
                  <Label>Username</Label>
                  <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="soccerfan" />
                </div>
                <div className="space-y-2">
                  <Label>Email</Label>
                  <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" />
                </div>
                <div className="space-y-2">
                  <Label>Password</Label>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" />
                </div>
                <Button type="submit" className="w-full" disabled={registerMutation.isPending}>{registerMutation.isPending ? "Creating..." : "Create account"}</Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
