export function Usuarios() {
  const players = [
    { id: 1, name: "Alex Johnson", email: "alex@example.com", joinDate: "2023-12-15", tickets: 47, spent: "$235", status: "vip" },
    { id: 2, name: "Sarah Chen", email: "sarah@example.com", joinDate: "2024-01-02", tickets: 32, spent: "$160", status: "active" },
    { id: 3, name: "Mike Rodriguez", email: "mike@example.com", joinDate: "2023-11-20", tickets: 28, spent: "$140", status: "winner" },
    { id: 4, name: "Emma Watson", email: "emma@example.com", joinDate: "2024-01-01", tickets: 25, spent: "$125", status: "active" }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">Players</h1>
          <p className="text-muted-foreground mt-1">Manage your community and track player activity.</p>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input placeholder="Search players..." className="pl-10 bg-card border-border" />
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {players.map((player) => (
          <Card key={player.id} className="border-border bg-card/50 backdrop-blur-sm hover:shadow-lg transition-all duration-300">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center">
                      <span className="text-primary-foreground font-bold">{player.name.charAt(0)}</span>
                    </div>
                    <div>
                      <h3 className="font-semibold">{player.name}</h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="w-3 h-3" />
                        {player.email}
                      </p>
                    </div>
                  </div>
                  <Badge variant={player.status === 'vip' ? 'default' : player.status === 'winner' ? 'secondary' : 'outline'}>
                    {player.status.toUpperCase()}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <Ticket className="w-4 h-4 mx-auto mb-1 text-primary" />
                    <p className="font-semibold">{player.tickets}</p>
                    <p className="text-muted-foreground">Tickets</p>
                  </div>
                  <div className="text-center p-3 bg-muted/30 rounded-lg">
                    <Trophy className="w-4 h-4 mx-auto mb-1 text-accent" />
                    <p className="font-semibold">{player.spent}</p>
                    <p className="text-muted-foreground">Spent</p>
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  Joined {player.joinDate}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}