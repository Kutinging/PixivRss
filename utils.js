const fs = require('fs');
const path = require('path');
//
const mysql = require('mysql');
const got = require('got');
const formData = require('form-data');
const _DATE_FORMAT = require('date.format');
//
const config = require('./config.js');

const padLeft = ' '.repeat(11);

// log
const LOG = {
  path: path.join(__dirname, 'log'),
  log(pixivId, msg) {
    if( !config.debug ) {
      return false;
    }
    if( !msg ) {
      msg = pixivId;
      pixivId = undefined;
    }
    let now = new Date();
    let _msg = `[${now.format('{hh}:{mm}:{ss}')}] ` + (pixivId ? ` ${pixivId} >` : '') + msg;
    console.log(_msg);
    this.output(_msg);
  },
  end() {
    this.output('\r\n');
  },
  output(msg) {
    let date = new Date(), fpath = path.join(LOG.path, date.format('{YYYY}-{MM}-{DD}.log'));
    fs.appendFile(fpath, `${msg}\r\n`, (err) => {
      if( err ) {
        console.error(`写入日志文件失败 ${err}`);
      }
    });
  }
}

// net
class HTTP {
  constructor(opt) {
    // 合并headers
    this.headers = Object.assign({
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
      'Accept-Encoding': 'gzip, deflate, br',
      'Accept-Language': 'zh-CN,zh;q=0.8',
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_12_1) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.98 Safari/537.36'
    }, opt.headers);
    // 是否使用cookie
    if( opt.cookie ) {
      this.useCookie = true;
      this.cookiePath = path.join(__dirname, `cookie.${opt.cookie}.txt`);
    }
  }
  loadCookie() {
    if( this.useCookie ) {
      this.headers.cookie = this.useCookie ? fs.readFileSync(this.cookiePath, 'utf-8') : undefined;
    }
  }
  saveCookie(remoteCookie) {
    if( this.useCookie && remoteCookie ) {
      LOG.log(`设置 Cookie：${remoteCookie}`)
      fs.writeFileSync(this.cookiePath, remoteCookie);
    }
  }
  get(url) {
    LOG.log(`发起 get 请求，url：${url}`);
    return new Promise((resolve, reject) => {
      this.loadCookie();
      got(url, {
        headers: this.headers,
      }).then((res) => {
        this.saveCookie(res.headers['set-cookie']);
        resolve(res);
      }).catch((err) => {
        LOG.log(`请求失败：${JSON.stringify(err)}`);
        reject(err);
      });
    });
  }
  post(url, data) {
    LOG.log(`发起 post 请求，url：${url}`);
    return new Promise((resolve, reject) => {
      this.loadCookie();
      // 打包post数据。。好蠢
      let form = new formData();
      for( let key in data ) {
        form.append(key, data[key]);
      }
      got.post(url, {
        headers: this.headers,
        body: form
      }).then((res) => {
        this.saveCookie(res.headers['set-cookie']);
        resolve(res);
      }).catch((err) => {
        LOG.log(`请求失败：${JSON.stringify(err)}`);
        reject(err);
      });
    });
  }
  download(url, fpath) {
    LOG.log(`下载图片：${url}`);
    let fullPath = path.join(__dirname, 'previews', fpath);
    got.stream(url, {
      headers: this.headers,
      cookie: this.cookieContent
    }).pipe(fs.createWriteStream(fullPath));
  }
}

// mysql
class DB {
  constructor() {
    this.cursor = mysql.createConnection({
      host: 'localhost',
      database: 'pixiv_rss',
      user: config.db.user,
      password: config.db.password
    });
  }
  query(sql, callback) {
    this.cursor.connect((err) => {
      if( err ) {
        return callback(err);
      }
    });
    this.cursor.query(sql, callback);
    this.cursor.end();
  }
}

// 已下载列表
const EXIST = {
  read(mode) {
    let raw = fs.readFileSync(path.join(__dirname, 'exist', `${mode}.json`), 'utf-8');
    if( !raw ) {
      return [];
    } else {
      return JSON.parse(raw);
    }
  },
  save(mode, data) {
    fs.writeFile(path.join(__dirname, 'exist', `${mode}.json`), JSON.stringify(data));
  }
}

module.exports = {
  DB, LOG, HTTP, EXIST
};