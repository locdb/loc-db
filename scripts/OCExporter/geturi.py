#!/usr/bin/env python3
import json
import sys
import subprocess


def to_clipboard(text):
    p = subprocess.Popen(['xclip', '-selection', 'clipboard'], stdin=subprocess.PIPE)
    p.stdin.write(text.encode("utf8"))
    p.stdin.close()
    p.wait()


query = sys.argv[1]
with open("context.json", "r", encoding="utf8") as f:
    context = json.load(f)["@context"]
    try:
        res = context[query]
        if res == "@type":
            res = "http://www.w3.org/1999/02/22-rdf-syntax-ns#type"
        if "@id" in res:
            res = res["@id"]
        if ":" in res and "//" not in res:
            res = res.split(":")
            res = "{}{}".format(context[res[0]], res[1])
        print(res)
        to_clipboard(res)
    except KeyError as k:
        print("No result found for: {}, error: {}".format(query, k))
