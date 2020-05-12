import config from "@/config";
import expressLoader from "@/loaders/express-loader";
import routeCollector from "@/loaders/route-collector";
import { init as dbInit } from "@/loaders/db-loader";
import { Application } from "express";
import { Server } from "http";
import "reflect-metadata";
import axios, { AxiosResponse } from "axios";
import { join } from "path";
import { IConfig } from "@/@types";
import { expect } from "chai";

interface DumpServerConfigs {
  isTesting?: boolean;
  isProduction?: boolean;
  withoutRoutes?: boolean;
  port?: number;
}

type ResponseType = "error" | "good";

class DumpServer {
  [index: string]: any;
  public static servers = new Map<string, DumpServer>();
  public static register(name: string, server: DumpServer) {
    this.servers.set(name, server);
  }
  public static unregister(name: string) {
    this.servers.delete(name);
  }
  public static get(name: string): DumpServer {
    return this.servers.get(name) as DumpServer;
  }

  public app: Application;
  public server: Server | null;
  public config: IConfig;

  constructor(options: DumpServerConfigs = {}) {
    // initializing configs
    config.init();
    this.config = Object.assign({}, config);
    this.config.isTesting = options.isTesting ?? true;
    this.config.isProduction = options.isProduction ?? false;
    this.config.port = options.port ?? 3000;

    // creating express app
    this.app = expressLoader();

    // collecting routes
    if (!options.withoutRoutes) routeCollector(this.app, this.config);

    this.server = null;
  }

  public static async startConnection() {
    config.mongoConnection = await dbInit();
  }
  public static stopConnection() {
    config.mongoConnection?.fast.close();
    config.mongoConnection?.slow.close();
  }

  public get listening() {
    return this.server?.listening ?? false;
  }
  public get instance() {
    return this.server;
  }

  public start(): void {
    if (this.server) throw new Error("Cannot start server, it's already started");
    this.restart();
  }
  public restart(): void {
    if (this.server) this.server.close();
    this.server = this.app.listen(this.config.port);
    this.config.server = this.server;
  }
  public stop(): void {
    if (!this.server) throw new Error("Cannot stop server, it's not active now");
    this.server.close();
  }

  public post(point: string, data = {}, token = ""): Promise<AxiosResponse<any>> {
    return axios.post(
      `http://localhost:${this.config.port}${join("/api", point)}`,
      data,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
  }
  public postForError(
    point: string,
    done: Function,
    tests: Function,
    data = {},
    token = ""
  ) {
    this.post(point, data, token)
      .then(() => done("Error"))
      .catch((err) => {
        tests(err.response);
        done();
      });
  }
  public postForGood(
    point: string,
    done: Function,
    tests: Function,
    data = {},
    token = ""
  ) {
    this.post(point, data, token)
      .then((res) => {
        tests(res);
        done();
      })
      .catch(() => done("Error"));
  }
  public postForCode(
    point: string,
    done: Function,
    code: number,
    status: ResponseType,
    data = {},
    token = ""
  ) {
    let method: string = "";
    if (status === "good") method = "postForGood";
    else if (status === "error") method = "postForError";

    if (method in this) {
      this[method](
        point,
        done,
        (res: AxiosResponse) => {
          expect(res.status).to.be.equal(code);
        },
        data,
        token
      );
    }
  }

  public postForProtected(point: string, done: Function) {
    // no token
    this.post(point)
      .then(() => done("Error"))
      .catch((err) => {
        expect(err.response.status).to.be.equal(401);

        // bad token
        return this.post(point, {}, "some.false.token");
      })
      .then(() => done("Error"))
      .catch((err) => {
        expect(err.response.status).to.be.equal(403);
        done();
      });
  }

  public postForNotFound(point: string, done: Function, data = {}, token = "") {
    this.postForCode(point, done, 404, "error", data, token);
  }

  public postForDeny(point: string, done: Function, data = {}, token = "") {
    this.postForCode(point, done, 400, "error", data, token);
  }

  public postForOk(point: string, done: Function, data = {}, token = "") {
    this.postForCode(point, done, 200, "good", data, token);
  }

  public postForBadBody(point: string, done: Function, data = {}, token = "") {
    this.postForCode(point, done, 412, "error", data, token);
  }
}

export default DumpServer;
