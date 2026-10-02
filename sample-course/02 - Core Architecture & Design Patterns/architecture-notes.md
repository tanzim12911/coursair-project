# Architecture Reference Notes

### Range Request Headers:
```http
Range: bytes=0-1048575
```
Response:
```http
HTTP/1.1 206 Partial Content
Content-Range: bytes 0-1048575/15894200
Content-Length: 1048576
Content-Type: video/mp4
```

> **Key Rule**: Range headers allow browsers to seek forward instantly without buffering the entire multi-gigabyte video file.
