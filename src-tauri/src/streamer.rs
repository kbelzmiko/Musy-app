use std::fs::File;
use std::io::{Read, Seek, SeekFrom};
use std::path::Path;
use std::sync::atomic::{AtomicU16, Ordering};
use tiny_http::{Header, Response, Server};

static PORT: AtomicU16 = AtomicU16::new(0);

pub fn get_port() -> u16 {
    PORT.load(Ordering::Relaxed)
}

pub fn start() {
    let server = Server::http("127.0.0.1:0").expect("Failed to start stream server");
    let port = server.server_addr().to_ip().unwrap().port();
    PORT.store(port, Ordering::Relaxed);
    eprintln!("Stream server started on port {}", port);

    std::thread::spawn(move || {
        for request in server.incoming_requests() {
            std::thread::spawn(|| {
                handle_request(request);
            });
        }
    });
}

fn handle_request(request: tiny_http::Request) {
    let url = request.url().to_string();

    if !url.starts_with("/stream") {
        let response = Response::from_string("Not Found").with_status_code(404);
        let _ = request.respond(response);
        return;
    }

    let path = url
        .split('?')
        .nth(1)
        .and_then(|q| {
            for pair in q.split('&') {
                let mut parts = pair.splitn(2, '=');
                if parts.next() == Some("path") {
                    return parts.next();
                }
            }
            None
        })
        .and_then(|p| urlencoding::decode(p).ok())
        .map(|s| s.to_string());

    let Some(path) = path else {
        let response = Response::from_string("Missing path parameter").with_status_code(400);
        let _ = request.respond(response);
        return;
    };

    let file_path = Path::new(&path);
    if !file_path.is_file() {
        let response = Response::from_string("File not found").with_status_code(404);
        let _ = request.respond(response);
        return;
    }

    let file_size = match std::fs::metadata(&file_path) {
        Ok(m) => m.len(),
        Err(_) => {
            let response = Response::from_string("Could not read file metadata").with_status_code(500);
            let _ = request.respond(response);
            return;
        }
    };

    let mime_type = get_mime_type(file_path);

    let range_header = request
        .headers()
        .iter()
        .find(|h| h.field.as_str().as_str().eq_ignore_ascii_case("range"))
        .map(|h| h.value.to_string());

    if let Some(range) = range_header {
        if let Some(range_val) = range.strip_prefix("bytes=") {
            let parts: Vec<&str> = range_val.splitn(2, '-').collect();
            let start: u64 = parts[0].parse().unwrap_or(0);
            let end: u64 = if parts.len() > 1 && !parts[1].is_empty() {
                parts[1].parse().unwrap_or(file_size - 1)
            } else {
                file_size - 1
            };

            if start >= file_size {
                let response = Response::from_string("Range not satisfiable")
                    .with_status_code(416)
                    .with_header(
                        Header::from_bytes("Content-Range", format!("bytes */{}", file_size))
                            .unwrap(),
                    );
                let _ = request.respond(response);
                return;
            }

            let length = end - start + 1;

            match File::open(&file_path) {
                Ok(mut f) => {
                    if f.seek(SeekFrom::Start(start)).is_err() {
                        let response = Response::from_string("Seek error").with_status_code(500);
                        let _ = request.respond(response);
                        return;
                    }
                    let mut buf = vec![0u8; length as usize];
                    if f.read_exact(&mut buf).is_err() {
                        let response = Response::from_string("Read error").with_status_code(500);
                        let _ = request.respond(response);
                        return;
                    }

                    let content_range = format!("bytes {}-{}/{}", start, end, file_size);
                    let response = Response::from_data(buf)
                        .with_status_code(206)
                        .with_header(Header::from_bytes("Content-Range", content_range.as_str()).unwrap())
                        .with_header(Header::from_bytes("Content-Type", mime_type).unwrap())
                        .with_header(Header::from_bytes("Accept-Ranges", "bytes").unwrap())
                        .with_header(Header::from_bytes("Access-Control-Allow-Origin", "*").unwrap())
                        .with_header(
                            Header::from_bytes("Content-Length", length.to_string()).unwrap(),
                        )
                        .with_header(
                            Header::from_bytes("Connection", "keep-alive").unwrap(),
                        );
                    let _ = request.respond(response);
                    return;
                }
                Err(_) => {
                    let response = Response::from_string("Could not open file").with_status_code(500);
                    let _ = request.respond(response);
                    return;
                }
            }
        }
    }

    match File::open(&file_path) {
        Ok(mut f) => {
            let mut buf = Vec::new();
            if f.read_to_end(&mut buf).is_err() {
                let response = Response::from_string("Read error").with_status_code(500);
                let _ = request.respond(response);
                return;
            }
            let response = Response::from_data(buf)
                .with_status_code(200)
                .with_header(Header::from_bytes("Content-Type", mime_type).unwrap())
                .with_header(Header::from_bytes("Accept-Ranges", "bytes").unwrap())
                .with_header(Header::from_bytes("Access-Control-Allow-Origin", "*").unwrap())
                .with_header(
                    Header::from_bytes("Content-Length", file_size.to_string()).unwrap(),
                )
                .with_header(Header::from_bytes("Connection", "keep-alive").unwrap());
            let _ = request.respond(response);
        }
        Err(_) => {
            let response = Response::from_string("Could not open file").with_status_code(500);
            let _ = request.respond(response);
        }
    }
}

fn get_mime_type(path: &Path) -> &'static str {
    match path.extension().and_then(|e| e.to_str()) {
        Some("mp3") => "audio/mpeg",
        Some("ogg") => "audio/ogg",
        Some("wav") => "audio/wav",
        Some("flac") => "audio/flac",
        Some("aac") => "audio/aac",
        Some("m4a") => "audio/mp4",
        Some("wma") => "audio/x-ms-wma",
        _ => "application/octet-stream",
    }
}
