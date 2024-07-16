"use client";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { FaGithub } from "react-icons/fa";
import { SiGooglesheets } from "react-icons/si";

// Function to fetch and parse CSV data
async function fetchCSVData(url, abortSignal) {
  const res = await fetch(url, { signal: abortSignal });

  if (!res.ok) {
    throw new Error("Failed to fetch data");
  }

  const text = await res.text();
  const cleanText = text.replace(/\r/g, ""); // Remove all '\r' characters
  const rows = cleanText.split("\n").map((row) => row.split(","));

  const headers = rows[0]; // Assuming first row contains headers
  const data = rows.slice(1).map((row) => {
    const rowData = {};
    headers.forEach((header, index) => {
      rowData[header] = row[index];
    });
    return rowData;
  });

  return data;
}
function readCSVCache(id) {
  const text = localStorage.getItem(`nim-cache:${id}`);
  if (text == null) return null;
  const data = (() => {
    try {
      return JSON.parse(text);
    } catch (_) {
      return null;
    }
  })();
  if (data == null) return null;
  const age = Date.now() - data.lastFetched;
  if (isNaN(age) || age >= 7 * 24 * 60 * 60 * 1000) return null;
  return data.payload;
}
function putCSVCache(id, payload) {
  const data = {
    lastFetched: Date.now(),
    payload: payload,
  };
  const text = JSON.stringify(data);
  localStorage.setItem(`nim-cache:${id}`, text);
}

function seedrandom(seed) {
  // sfc32 with cyrb128 seeder
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0, k; i < seed.length; i++) {
    k = seed.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  h1 = h1 >>> 0;
  h2 = h2 >>> 0;
  h3 = h3 >>> 0;
  h4 = h4 >>> 0;
  return () => {
    h1 |= 0;
    h2 |= 0;
    h3 |= 0;
    h4 |= 0;
    let t = (((h1 + h2) | 0) + h4) | 0;
    h4 = (h4 + 1) | 0;
    h1 = h2 ^ (h2 >>> 9);
    h2 = (h3 + (h3 << 3)) | 0;
    h3 = (h3 << 21) | (h3 >>> 11);
    h3 = (h3 + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}
function forwardHash(string) {
  const random = seedrandom(string);
  random();
  random();
  random();
  random();
  random();
  return `${[...new Array(24)].map(() => Math.floor(random() * 16).toString(16)).join("")}`;
}

async function getData(abortSignal) {
  const cacheFirstThenFetch = async (url) => {
    const cacheId = forwardHash(url);
    const cached = readCSVCache(cacheId);
    if (cached != null) return cached;
    const fetched = await fetchCSVData(url, abortSignal);
    putCSVCache(cacheId, fetched);
    return fetched;
  };

  const urls = {
    angkatan20:
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vTE2qC8JGbyobYANyA461vgrpVB_F1ByyvHcMerzr1ccWWd1XX1b62KiZ6iIFCXVUvY_Ce-VRonqE28/pub?gid=0&single=true&output=csv",
    angkatan21:
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vTE2qC8JGbyobYANyA461vgrpVB_F1ByyvHcMerzr1ccWWd1XX1b62KiZ6iIFCXVUvY_Ce-VRonqE28/pub?gid=665736526&single=true&output=csv",
    angkatan22:
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vTE2qC8JGbyobYANyA461vgrpVB_F1ByyvHcMerzr1ccWWd1XX1b62KiZ6iIFCXVUvY_Ce-VRonqE28/pub?gid=1486137275&single=true&output=csv",
    angkatan23:
      "https://docs.google.com/spreadsheets/d/e/2PACX-1vTE2qC8JGbyobYANyA461vgrpVB_F1ByyvHcMerzr1ccWWd1XX1b62KiZ6iIFCXVUvY_Ce-VRonqE28/pub?gid=357693732&single=true&output=csv",
  };

  return (
    await Promise.all(
      Object.entries(urls).map(async ([k, v]) => (await cacheFirstThenFetch(v)).map((d) => ({ ...d, Dataset: k })))
    )
  ).flat();
}

function newLazyFilter(data, filter, advance) {
  // assumes data is not modifiable.
  let dataIndex = 0;
  let resultTarget = 0;
  let resultLength = 0;
  const next = () => {
    if (dataIndex >= data.length) return null;
    const result = [];
    resultTarget += advance;
    while (resultLength + result.length < resultTarget && dataIndex < data.length) {
      const item = data[dataIndex];
      if (!filter(item)) {
        dataIndex++;
        continue;
      }
      result.push(item);
      dataIndex++;
    }
    resultLength += result.length;
    return result;
  };
  return {
    get index() {
      return dataIndex;
    },
    next: next,
  };
}

function glob2Regex(string) {
  let regex = "";
  let inGroup = false;
  let inRange = false;
  let c;
  for (let i = 0; i < string.length; i++) {
    switch ((c = string[i])) {
      case "/":
      case "$":
      case "^":
      case "+":
      case ".":
      case "(":
      case ")":
      case "=":
      case "|":
        regex += "\\" + c;
        break;
      case "?":
        regex += ".";
        break;
      case "[":
        inRange = true;
        regex += c;
        break;
      case "]":
        inRange = false;
        regex += c;
        break;
      case "!":
        if (inRange) {
          regex += "^";
          break;
        }
        regex += c;
        break;
      case "{":
        inGroup = true;
        regex += "(";
        break;
      case "}":
        inGroup = false;
        regex += ")";
        break;
      case ",":
        if (inGroup) {
          regex += "|";
          break;
        }
        regex += c;
        break;
      case "*":
        while (string[i + 1] == "*") i++;
        regex += ".*";
        break;
      case "\\":
        regex += "\\" + (string[++i] || "");
        break;
      default:
        regex += c;
    }
  }
  regex = `^${regex}$`;
  try {
    return new RegExp(regex, "i");
  } catch (_) {
    return /(?!.*)/g; // regex that does not match anything
  }
}
function safeStringEvaluation(string) {
  let i = 0;
  let result = "";
  const quote = string[i++];
  if ((quote != "'" && quote != '"') || string[string.length - 1] != quote) throw new Error("String not quoted properly");
  while (i < string.length - 1) {
    const char = string[i++];
    if (char == "\\") {
      const nextChar = string[i++];
      if (nextChar == null) throw new Error("Expecting next char after escape character");
      if (nextChar == "n") result += "\n";
      else if (nextChar == "r") result += "\r";
      else if (nextChar == "t") result += "\t";
      else result += nextChar;
      continue;
    }
    result += char;
  }
  return result;
}
function categoryFilter(searchTerm) {
  const optionalInclude = (s) => (s.includes("*") ? s : `*${s}*`);
  const keywordQueries = [];
  const plainQueries = [];
  const regex = /([a-zA-Z$_][a-zA-Z0-9$_-]*):(?:((?:"(?:[^"\\]|\\.)*")|(?:'(?:[^'\\]|\\.)*'))|([^\s]*))/g;
  let lastIndex = 0;
  let matcher;
  while ((matcher = regex.exec(searchTerm)) != null) {
    keywordQueries.push({
      name: matcher[1],
      value: matcher[2] ? optionalInclude(safeStringEvaluation(matcher[2])) : optionalInclude(matcher[3]),
    });
    plainQueries.push(searchTerm.slice(lastIndex, matcher.index));
    lastIndex = matcher.index + matcher[0].length;
  }
  if (lastIndex < searchTerm.length) plainQueries.push(searchTerm.slice(lastIndex));
  for (let i = plainQueries.length - 1; i >= 0; i--) {
    const plainQuery = (plainQueries[i] = optionalInclude(plainQueries[i].trim().replaceAll(/\s+/g, " ")));
    if (plainQuery.length > 0) continue;
    plainQueries.splice(i, 1);
  }
  const keywordTests = keywordQueries.map((q) => {
    const r = glob2Regex(q.value);
    return { ...q, test: (s) => r.test(s) };
  });
  const plainTests = plainQueries.map((q) => {
    const r = glob2Regex(q);
    return { value: q, test: (s) => r.test(s) };
  });
  const filter = (d) => {
    if (plainTests.some((t) => !Object.values(d).some((v) => t.test(v)))) return false;
    const keywordKeys = Object.fromEntries(Object.keys(d).map((k) => [k.toLowerCase().replaceAll(/[^a-zA-Z0-9$_-]/g, "-"), k]));
    if (keywordTests.some((t) => keywordKeys[t.name] == null || !t.test(d[keywordKeys[t.name]]))) return false;
    return true;
  };
  return {
    keywordQueries: keywordQueries,
    plainQueries: plainQueries,
    filter: filter,
  };
}

export default function Home() {
  const [data, setData] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [lazyFilter, setLazyFilter] = useState(null);
  const [filteredData, setFilteredData] = useState([]);

  useEffect(() => {
    if (data == null || !searchTerm) {
      setLazyFilter(null);
      setFilteredData([]);
      return;
    }
    const lazyFilter = newLazyFilter(data, categoryFilter(searchTerm).filter, 20);
    setLazyFilter(lazyFilter);
    setFilteredData(lazyFilter.next());
  }, [data, searchTerm]);

  useEffect(() => {
    if (lazyFilter == null) return;
    const filterIndex = lazyFilter.index;
    const setupForIndex = (index) => {
      const element = document.querySelector(`main .__card_item:nth-child(${index + 1})`);
      const observer = new IntersectionObserver((e) => {
        if (lazyFilter.index != filterIndex) {
          observer.disconnect();
          return;
        }
        if (!e.some((i) => i.intersectionRatio > 0)) return;
        observer.disconnect();
        const newFilteredData = lazyFilter.next();
        if (newFilteredData == null) return;
        setFilteredData((d) => [...d, ...newFilteredData]);
      });
      observer.observe(element);
      return () => observer.disconnect();
    };
    const cleanups = [];
    if (filteredData.length >= 10) cleanups.push(setupForIndex(filteredData.length - 10));
    if (filteredData.length > 0) cleanups.push(setupForIndex(filteredData.length - 1));
    return () => {
      for (const cleanup of cleanups) cleanup();
    };
  }, [lazyFilter, filteredData]);

  useEffect(() => {
    const abortController = new AbortController();
    let finished = false;
    getData(abortController.signal)
      .then((d) => setData(d))
      .finally(() => (finished = true));
    return () => {
      if (finished) return;
      abortController.abort("fail");
    };
  }, []);

  async function deleteAllCSVCache() {
    new Array(localStorage.length)
      .fill(null)
      .map((_, i) => localStorage.key(i))
      .filter((k) => k.startsWith("nim-cache:"))
      .forEach((k) => localStorage.removeItem(k));

    setFilteredData([]);
    const data = await getData();
    console.log(data);
    setData(await getData());
  }

  return (
    <main className="flex h-screen flex-col items-center justify-center w-full py-8 bg-black text-white relative">
      <div className="w-fit h-screen fixed left-0">
        <div className="h-full w-fit relative">
          <Image src="/tv-man.png" alt="tv-man skibidi" width={200} height={200} className="h-full w-auto" />
          <div className="absolute left-0 top-0 bg-gradient-to-l from-black via-black/30 to-black h-full w-full" />
          <div className="absolute left-0 top-0 bg-gradient-to-t from-black via-black/30 to-black h-full w-full" />
        </div>
      </div>
      <div className="w-full max-w-[604px] flex justify-between px-4">
        <div className="relative flex flex-col justify-center">
          <h1 className="text-white relative py-10">Ketik NIM untuk mencari sang sigma skibidi!</h1>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center">
            <div className="flex gap-4">
              <Link target="_blank" href="https://github.com/reletz/webnya23">
                <FaGithub size={25} className="hover:scale-[125%] ease-in duration-150" />
              </Link>
              <Link
                target="_blank"
                href="https://docs.google.com/spreadsheets/d/1ijk4ypd1z0OJwwIm62ztPfncu_mUjRTa-jmBX28I3sc/edit?usp=sharing ">
                <SiGooglesheets size={25} className="hover:scale-[125%] ease-in duration-150" />
              </Link>
            </div>
            <button
              onClick={() => deleteAllCSVCache()}
              className="bg-white rounded-lg text-black px-2 py-1 font-semibold hover:scale-105 duration-150 shadow-transparent shadow-lg hover:shadow-white/50">
              Clear Cache
            </button>
          </div>
        </div>
        <div className="h-auto max-h-[201px] self-stretch w-[10rem] relative py-4">
          <Image src="/skibidi-toilet.png" alt="tv-man skibidi" width={200} height={200} className="h-full w-full object-cover" />
          <div className="absolute left-0 top-0 bg-gradient-to-l from-black via-black/10 to-black h-full w-full" />
          <div className="absolute left-0 top-0 bg-gradient-to-t from-black via-black/10 to-black h-full w-full" />
        </div>
      </div>
      <div className="p-4 w-full relative max-w-[604px]">
        <div className="relative w-full group">
          <div className="absolute -inset-0.5 rounded-lg w-full blur bg-gradient-to-tr from-purple-700 to-red-700 group-hover:blur-lg duration-150 ease-in" />
          <input
            type="text"
            placeholder="Search by NIM"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={`relative p-2 border-none rounded-lg w-full focus:outline-none max-w-[600px] mx-auto ${
              data == null ? "bg-gray-900" : "bg-black"
            }`}
            disabled={data == null}
          />
        </div>
      </div>

      <div className="h-0 grow pr-2 py-4 w-full max-w-[700px] relative">
        {data == null && <p>Sedang mengambil data...</p>}
        <div className="w-full flex flex-col h-full overflow-y-auto overflow-x-clip gap-4 py-2 px-6">
          {searchTerm && lazyFilter && filteredData.length == 0 && <p>No results found</p>}
          {filteredData.map((item) => (
            <div
              key={item.NIM}
              className="__card_item hover:scale-105 group duration-150 ease-in flex w-full rounded-lg px-2 py-4 bg-white/50 bg-gradient-to-tr from-white/80 to-white/50 text-black flex-col md:flex-row">
              <div className="flex h-full items-center justify-center w-fit">
                <p className="font-bold px-2 md:p-0 md:pr-2">{item.NIM}</p>
              </div>
              <div className="pl-2 grow flex flex-col-reverse md:flex-col">
                <p className="text-xs tracking-wide uppercase">
                  Jurusan: {item.Jurusan} - Kampus {item.Kampus || "ITB"}
                </p>
                <p className="text-xl group-hover:underline duration-150 ease-in">{item["Nama Lengkap"]}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
