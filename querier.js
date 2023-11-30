const {
    isEmpty,
    get,
    filter,
    isFunction,
    transform,
    isObject,
    extend,
    set,
    first,
} = require("lodash");

const isDebugMode = process.env.FIRESTORE_QUERIER_DEBUG === 'true'
const _collQueryBuilder = (firestoreInstance, coll, wheres) => {
    let collRef = firestoreInstance.collection(coll)
    if (isEmpty(wheres)) {
        return collRef
    }
    wheres = Array.isArray(wheres) ? wheres : [wheres]
    wheres.forEach(where => {
        if (Array.isArray(where)) {
            collRef = collRef.where(...where)
        } else if (isObject(where)) {
            Object.keys(where).forEach(
                key => {
                    if (isFunction(collRef[key])) {
                        let val = where[key]
                        // spread val for orderBy
                        if (Array.isArray(val)) {
                            collRef = collRef[key](...val)
                        } else {
                            collRef = collRef[key](val)
                        }
                    }
                }
            )
        }
    })
    return collRef
}

async function queryWheres(firestoreInstance, coll, wheres, filters, transforms, appendRootFields) {
    if (isDebugMode) {
        _logQueryColl(coll, wheres, filters, transforms, appendRootFields)
    }
    const collRef = _collQueryBuilder(firestoreInstance, coll, wheres)
    const snapshot = await collRef.get()
    return _executeSnapshot(snapshot, filters, transforms, appendRootFields)
}

function onSnapshotQueryWheres(firestoreInstance, coll, wheres, filters, transforms, appendRootFields, callback, onError) {
    if (isDebugMode) {
        _logQueryColl(coll, wheres, filters, transforms, appendRootFields)
    }
    const collRef = _collQueryBuilder(firestoreInstance, coll, wheres)
    return collRef.onSnapshot(
        snapshot => {
            const docs = _executeSnapshot(snapshot, filters, transforms, appendRootFields)
            if (isFunction(callback)) {
                callback(docs, snapshot.docChanges())
            }
        },
        onError
    )
}


async function queryDoc(firestoreInstance, docPath, transforms, appendRootFields) {
    if (isDebugMode) {
        _logQueryDoc(docPath, transforms, appendRootFields)
    }
    const docRef = firestoreInstance.doc(docPath)
    const doc = await docRef.get()
    if (!doc.exists) {
        console.log(`No doc found in ${docPath}`)
        return null
    }

    let data = doc.data()
    if (!isEmpty(transforms)) {
        data = first(_executeTransforms(
            [data],
            transforms
        ))
    }
    if (!isEmpty(appendRootFields) && Array.isArray(appendRootFields)) {
        appendRootFields.forEach(field => {
            data[field] = get(data, field)
        })
    }
    return data
}

function onSnapshotQueryDoc(firestoreInstance, docPath, transforms, appendRootFields, callback, onError) {
    if (isDebugMode) {
        _logQueryDoc(docPath, transforms, appendRootFields)
    }
    const docRef = firestoreInstance.doc(docPath)
    return docRef.onSnapshot(
        snapshot => {
            if (!snapshot.exists) {
                console.log(`No doc found in ${docPath}`)
                if (isFunction(callback)) {
                    callback(null)
                }
            }
            let data = snapshot.data()
            if (!isEmpty(transforms)) {
                data = first(_transformsDo(
                    [data],
                    transforms
                ))
            }
            if (!isEmpty(appendRootFields) && Array.isArray(appendRootFields)) {
                appendRootFields.forEach(field => {
                    data[field] = get(data, field)
                })
            }
            if (isFunction(callback)) {
                callback(data)
            }
        },
        onError
    )
}

// helper functions
function _flattenObject(ob) {
    return transform(ob, function (result, value, key) {
        if (isObject(value)) {
            extend(result, _flattenObject(value));
        } else {
            result[key] = value;
        }
    }, {});
}

function _transformsDo(docs, transforms) {
    if (Array.isArray(transforms)) {
        transforms.forEach(t => {
            if (isFunction(t)) {
                docs = docs.map(t)
            } else if (isObject(t)) {
                docs = docs.map(doc => {
                    Object.keys(t).forEach(
                        key => {
                            const fn = t[key]
                            set(doc, key, fn(get(doc, key)))
                        }
                    )
                    return doc
                })
            }
        })
    } else if (isObject(transforms)) {
        docs = docs.map(doc => {
            Object.keys(transforms).forEach(
                key => {
                    const fn = transforms[key]
                    set(doc, key, fn(get(doc, key)))
                }
            )
            return doc
        })
    }
    return docs;
}

function _toStringRecursive(ob) {
    return JSON.stringify(ob, (key, value) => {
        if (isFunction(value)) {
            return value.toString()
        }
        return value
    }, null)
}


function onProcessExit(exitFn) {
    process.on('exit', exitFn);
    process.on('SIGINT', exitFn);
    process.on('SIGTERM', exitFn);
}


const _executeFilter = (docs, filters) => {
    if (!isEmpty(filters)) {
        filters.forEach(filterFunc => {
            docs = filter(docs, filterFunc)
        })
    }
    return docs
}
const _executeTransforms = (docs, transforms) => {
    if (!isEmpty(transforms)) {
        docs = !Array.isArray(docs) ? [docs] : docs
        docs = _transformsDo(docs, transforms)
    }
    return docs
}
const _executeAppendRootFields = (docs, appendRootFields) => {
    if (!isEmpty(appendRootFields)) {
        docs = docs.map(doc => {
            appendRootFields.forEach(field => {
                doc[field] = get(doc, field)
            })
            return doc
        })
    }
    return docs
}

function _executeSnapshot(snapshot, filters, transforms, appendRootFields) {
    if (!snapshot) {
        return []
    }
    if (snapshot.empty) {
        console.log(`No docs found in ${snapshot.collection.path}`)
        return []
    }
    let docs = snapshot.docs.map(doc => {
        return {
            id: doc.id,
            // _ref: doc.ref,
            ...doc.data()
        }
    })

    if (!isEmpty(filters)) {
        docs = _executeFilter(docs, filters)
    }
    if (!isEmpty(transforms)) {
        docs = _executeTransforms(docs, transforms)
    }
    if (!isEmpty(appendRootFields)) {
        docs = _executeAppendRootFields(docs, appendRootFields)
    }
    return docs
}

const _logQueryColl = (coll, wheres, filters, transforms, appendRootFields) => {
    console.log("------", 'queryColl', "------")
    console.log({
        coll,
        wheres: _toStringRecursive(wheres),
        filters: _toStringRecursive(filters),
        transforms: _toStringRecursive(transforms),
        appendRootFields: _toStringRecursive(appendRootFields),
    })
    console.log("------")
}
const _logQueryDoc = (docPath, transforms, appendRootFields) => {
    console.log("------", 'queryDoc', "------")
    console.log({
        docPath,
        transforms: _toStringRecursive(transforms),
        appendRootFields
    })
    console.log("------")
}

module.exports = {
    queryWheres,
    queryColl: queryWheres,
    onSnapshotQueryWheres,
    onSnapshotQueryColl: onSnapshotQueryWheres,
    queryDoc,
    onSnapshotQueryDoc,
    onProcessExit,
}
