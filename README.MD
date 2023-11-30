## firestore-querier

A simple tool to query firestore database.

## Install:

```bash
npm i -S firestore-querier
```

## Usage:

```javascript

const {
onSnapshotQueryWheres,
onProcessExit,
} = require('firestore-querier');
const firebase = require('firebase-admin');
const moment = require('moment');

const fromTime = moment().subtract(3, 'day').startOf('day').toDate();
const toTime = moment().endOf('day').toDate();
const state = 'SUCCESS'

async function checkMails() {

    const unsub = onSnapshotQueryWheres(
        firebase.firestore(), // firestore instance
        "mails", // collection
        [ // wheres
            ['delivery.state', '==', state],
            ['delivery.endTime', '>=', fromTime],
            ['delivery.endTime', '<=', toTime],
            { // query functions
                orderBy: ['delivery.endTime', 'desc'],
                limit: 10
            },
        ],
        [ // filters returned docs 
            doc => !get(doc, 'template.name')?.includes('-stg'),
        ],
        [ // transforms
            doc => {
                const {delivery} = doc;
                return {
                    ...doc,
                    delivery: {
                        ...delivery,
                        endTime: moment(delivery.endTime).format('YYYY-MM-DD_HH:mm:ss'),
                        startTime: moment(delivery.startTime).format('YYYY-MM-DD_HH:mm:ss'),
                    }
                }
            },
            {
                'delivery.endTime': val => val.toString(),
                'delivery.startTime': val => val.toString(),
            },
        ],
        [ // appendRootFields
            'delivery.state',
            'delivery.endTime',
        ],
        
        // callback
        (docs, changes) => {
            console.table(docs);
            // console.table(changes);
        }
    )

    onProcessExit(() => {
        unsub()
    })
}

function main(){
    checkMails()
}

main()
```

RESULT:

```bash
┌─────────┬───────────────────────────────────────┬──────────────────────────────────────┬─────────────────────────────────────────────────────────┬──────────┬────────────────┬───────────────────────┐
│ (index) │                  id                   │                  to                  │                        template                         │ delivery │ delivery.state │   delivery.endTime    │
├─────────┼───────────────────────────────────────┼──────────────────────────────────────┼─────────────────────────────────────────────────────────┼──────────┼────────────────┼───────────────────────┤
│    0    │ 'inviteCreateUserAnswerForm_FHIpH5rY' │ 'thanhnguyen123+owner@classfunc.com' │ { name: 'inviteUserAnswerFormEnglish', data: [Object] } │ [Object] │   'SUCCESS'    │ '2023-11-30_13:52:22' │
│    1    │ 'inviteCreateUserAnswerForm_Cv6PysGF' │ 'thanhnguyen123+owner@classfunc.com' │ { data: [Object], name: 'inviteUserAnswerFormEnglish' } │ [Object] │   'SUCCESS'    │ '2023-11-30_13:49:43' │
│    2    │ 'inviteCreateUserAnswerForm_dFLQjH1B' │ 'thanhnguyen123+owner@classfunc.com' │ { name: 'inviteUserAnswerFormEnglish', data: [Object] } │ [Object] │   'SUCCESS'    │ '2023-11-30_13:14:25' │
│    3    │      'notificationsAnswer_SMNM3'      │  'hieunt+owner.prod@classfunc.com'   │     { data: [Object], name: 'notificationsAnswer' }     │ [Object] │   'SUCCESS'    │ '2023-11-30_11:24:30' │
└─────────┴───────────────────────────────────────┴──────────────────────────────────────┴─────────────────────────────────────────────────────────┴──────────┴────────────────┴───────────────────────┘
```

## API:

```javascript
// returns unsubscribe function
function onSnapshotQueryWheres(
firestoreInstance, // firestore instance, required
coll, // collection path, required
wheres, // [[field, operator, value] || Record<string,any>] || null 
filters, // [doc => boolean] || null
transforms, // [doc => doc || Record<string,fn>] || Record<string,fn> || null
appendRootFields, // [string] || null
callback, // (docs, changes) => {} || null
onError // (error) => {} || null
){
    // ...
}

```
```js
onSnapshotQueryColl = onSnapshotQueryWheres
```

```javascript
// returns list of docs
async function queryWheres(
    firestoreInstance, 
    coll,
    wheres, 
    filters, 
    transforms, 
    appendRootFields
) {
    // ...
}

```
```js
queryColl = queryWheres
```

```javascript
// returns doc data
async function queryDoc(
    firestoreInstance, 
    docPath, 
    transforms, 
    appendRootFields
) {
    // ...
}
```
```javascript
// returns unsubscribe function
function onSnapshotQueryDoc(
    firestoreInstance, 
    docPath, 
    transforms,
    appendRootFields, 
    callback, // (snapshot.data()) => {}
    onError
) {
    // ...
}
```

```javascript
function onProcessExit(exitFn) {
    // call unsubscribe functions
}
```


## License
MIT

## Author
ClassFunc Softwares JSC.
