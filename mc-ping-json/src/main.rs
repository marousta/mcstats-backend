use std::time::Duration;

use async_minecraft_ping::{ConnectionConfig, ServerDescription};
use serde::Serialize;
use tokio::time::timeout;

#[derive(Serialize)]
pub struct Output {
    status: bool,
    version: String,
    protocol: u32,
    description: String,
    players_online: u32,
    max_players: u32,
    player_names: Vec<String>,
}

#[tokio::main(flavor = "current_thread")]
async fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.len() > 3 || args.len() < 2 {
        eprintln!("Usage: {} <server ip> [port]", args[0]);
        std::process::exit(-1);
    }

    let server = &args[1];
    let port = args
        .get(2)
        .unwrap_or(&"25565".to_string())
        .parse::<u16>()
        .unwrap();

    let connection_config = ConnectionConfig::build(server).with_port(port);
    let connection = connection_config.connect();
    let connection = timeout(Duration::from_secs(3), connection).await;

   let connection = match connection {
        Ok(connection) => connection,
        Err(_) => {
            println!("{}", r#"{"status": false}"#);
            std::process::exit(1);
        }
    }.unwrap();

    let status = connection.status().await.unwrap().status;

    let version = status.version.name;
    let protocol = status.version.protocol;

    let description = match status.description {
        ServerDescription::Plain(str) => str,
        ServerDescription::Object { text } => text,
    };

    let players_online = status.players.online;
    let max_players = status.players.max;

    let player_names = status
        .players
        .sample
        .unwrap_or_default()
        .iter()
        .map(|x| x.name.clone())
        .collect();

    let output = Output {
        status: true,
        version,
        protocol,
        description,
        players_online,
        max_players,
        player_names,
    };

    println!("{}", serde_json::to_string(&output).unwrap());
}
