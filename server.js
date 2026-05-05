import sql from "mssql";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import fs from "fs/promises";
import path from "path";
import dotenv from "dotenv";
dotenv.config();

const pool = await sql.connect({
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  port: parseInt(process.env.DB_PORT, 10),
  database: process.env.DB_NAME,
  options: {
    encrypt: true,
    trustServerCertificate: true
  }
});


const server = new Server(
  {
    name: "mssql-server",
    version: "1.0.0"
  },
  {
    capabilities: {
      tools: {}
    }
  }
);

server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "query",
        description: "Run SQL SELECT queries",
        inputSchema: {
          type: "object",
          properties: {
            query: { type: "string" }
          },
          required: ["query"]
        }
      },
      {
        name: "read_file",
        description: "Read the contents of a text file",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "Absolute or relative path to the file" }
          },
          required: ["path"]
        }
      },
      {
        name: "read_image",
        description: "Read an image file and return it as base64 (supports png, jpg, gif, webp)",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "Absolute or relative path to the image file" }
          },
          required: ["path"]
        }
      },
      {
        name: "write_file",
        description: "Write content to a file, creating it if it does not exist",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "Path to the file" },
            content: { type: "string", description: "Content to write" },
            append: { type: "boolean", description: "If true, append instead of overwrite (default: false)" }
          },
          required: ["path", "content"]
        }
      },
      {
        name: "delete_file",
        description: "Delete a file",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "Path to the file to delete" }
          },
          required: ["path"]
        }
      },
      {
        name: "copy_file",
        description: "Copy a file from source to destination",
        inputSchema: {
          type: "object",
          properties: {
            source: { type: "string", description: "Source file path" },
            destination: { type: "string", description: "Destination file path" }
          },
          required: ["source", "destination"]
        }
      },
      {
        name: "move_file",
        description: "Move or rename a file or directory",
        inputSchema: {
          type: "object",
          properties: {
            source: { type: "string", description: "Source path" },
            destination: { type: "string", description: "Destination path" }
          },
          required: ["source", "destination"]
        }
      },
      {
        name: "file_info",
        description: "Get metadata about a file or directory (size, dates, type)",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "Path to the file or directory" }
          },
          required: ["path"]
        }
      },
      {
        name: "list_directory",
        description: "List contents of a directory",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "Path to the directory" },
            recursive: { type: "boolean", description: "If true, list recursively (default: false)" }
          },
          required: ["path"]
        }
      },
      {
        name: "create_directory",
        description: "Create a directory (and any missing parent directories)",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "Path of the directory to create" }
          },
          required: ["path"]
        }
      },
      {
        name: "delete_directory",
        description: "Delete a directory",
        inputSchema: {
          type: "object",
          properties: {
            path: { type: "string", description: "Path to the directory to delete" },
            recursive: { type: "boolean", description: "If true, delete all contents recursively (default: false)" }
          },
          required: ["path"]
        }
      },
      {
        name: "compare_images",
        description: "Compare two images side-by-side for visual comparison. Each can be a local file path or an HTTP/HTTPS URL (supports png, jpg, gif, webp)",
        inputSchema: {
          type: "object",
          properties: {
            path1: { type: "string", description: "File path or URL of the first image" },
            path2: { type: "string", description: "File path or URL of the second image" }
          },
          required: ["path1", "path2"]
        }
      }
    ]
  };
});

// ✅ TOOL HANDLER
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {

    case "read_file": {
      const content = await fs.readFile(args.path, "utf-8");
      return {
        content: [{ type: "text", text: content }]
      };
    }

    case "read_image": {
      const ext = path.extname(args.path).toLowerCase().slice(1);
      const mimeMap = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp" };
      const mimeType = mimeMap[ext];
      if (!mimeType) throw new Error(`Unsupported image type: .${ext}. Supported: png, jpg, gif, webp`);
      const data = await fs.readFile(args.path);
      return {
        content: [{ type: "image", data: data.toString("base64"), mimeType }]
      };
    }

    case "write_file": {
      const flag = args.append ? "a" : "w";
      await fs.writeFile(args.path, args.content, { encoding: "utf-8", flag });
      return {
        content: [{ type: "text", text: `File written: ${args.path}` }]
      };
    }

    case "delete_file": {
      await fs.unlink(args.path);
      return {
        content: [{ type: "text", text: `File deleted: ${args.path}` }]
      };
    }

    case "copy_file": {
      await fs.copyFile(args.source, args.destination);
      return {
        content: [{ type: "text", text: `Copied ${args.source} → ${args.destination}` }]
      };
    }

    case "move_file": {
      await fs.rename(args.source, args.destination);
      return {
        content: [{ type: "text", text: `Moved ${args.source} → ${args.destination}` }]
      };
    }

    case "file_info": {
      const stat = await fs.stat(args.path);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              path: args.path,
              isFile: stat.isFile(),
              isDirectory: stat.isDirectory(),
              size: stat.size,
              created: stat.birthtime,
              modified: stat.mtime,
              accessed: stat.atime
            }, null, 2)
          }
        ]
      };
    }

    case "list_directory": {
      async function listDir(dirPath, recursive) {
        const entries = await fs.readdir(dirPath, { withFileTypes: true });
        const results = [];
        for (const entry of entries) {
          const fullPath = path.join(dirPath, entry.name);
          const item = {
            name: entry.name,
            path: fullPath,
            type: entry.isDirectory() ? "directory" : "file"
          };
          if (recursive && entry.isDirectory()) {
            item.children = await listDir(fullPath, true);
          }
          results.push(item);
        }
        return results;
      }

      const listing = await listDir(args.path, args.recursive ?? false);
      return {
        content: [{ type: "text", text: JSON.stringify(listing, null, 2) }]
      };
    }

    case "create_directory": {
      await fs.mkdir(args.path, { recursive: true });
      return {
        content: [{ type: "text", text: `Directory created: ${args.path}` }]
      };
    }

    case "delete_directory": {
      await fs.rm(args.path, { recursive: args.recursive ?? false, force: false });
      return {
        content: [{ type: "text", text: `Directory deleted: ${args.path}` }]
      };
    }

    case "compare_images": {
      const mimeMap = { png: "image/png", jpg: "image/jpeg", jpeg: "image/jpeg", gif: "image/gif", webp: "image/webp" };
      const supportedMimes = new Set(Object.values(mimeMap));

      async function loadImage(source) {
        if (source.startsWith("http://") || source.startsWith("https://")) {
          const res = await fetch(source);
          if (!res.ok) throw new Error(`Failed to fetch image: ${res.status} ${res.statusText}`);
          const mimeType = (res.headers.get("content-type") || "").split(";")[0].trim();
          if (!supportedMimes.has(mimeType)) throw new Error(`Unsupported image MIME type from URL: ${mimeType}`);
          const buffer = Buffer.from(await res.arrayBuffer());
          return { data: buffer.toString("base64"), mimeType };
        } else {
          const ext = path.extname(source).toLowerCase().slice(1);
          const mimeType = mimeMap[ext];
          if (!mimeType) throw new Error(`Unsupported image type: .${ext}. Supported: png, jpg, gif, webp`);
          const buffer = await fs.readFile(source);
          return { data: buffer.toString("base64"), mimeType };
        }
      }

      const [img1, img2] = await Promise.all([loadImage(args.path1), loadImage(args.path2)]);

      return {
        content: [
          { type: "text", text: `Image 1: ${args.path1}` },
          { type: "image", data: img1.data, mimeType: img1.mimeType },
          { type: "text", text: `Image 2: ${args.path2}` },
          { type: "image", data: img2.data, mimeType: img2.mimeType }
        ]
      };
    }

    case "query": {
      const query = args.query;

      // 🔐 safety
      if (!query.toLowerCase().startsWith("select")) {
        throw new Error("Only SELECT allowed");
      }

      const result = await pool.request().query(query);

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({
              rows: result.recordset,
              row_count: result.recordset.length
            })
          }
        ]
      };
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});

await server.connect(new StdioServerTransport());
