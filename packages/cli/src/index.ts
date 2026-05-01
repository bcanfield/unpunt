#!/usr/bin/env node
import { cac } from "cac";

const cli = cac("un-punt");

cli.help();
cli.version("0.0.0");
cli.parse();
