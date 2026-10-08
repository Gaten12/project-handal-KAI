if (idToken) {
    try {
        if (getApps().length === 0) {
            req.user = { uid: 'mock-user' };
            return next();
        }
        const decodedToken = await getAuth().verifyIdToken(idToken);
        req.user = decodedToken;
        next();
    } catch (error) {
        console.error('Error verifying auth token', error);
        res.status(403).json({ message: 'Unauthorized: Invalid token' });
    }
} else {
    if (getApps().length === 0) {
        req.user = { uid: 'mock-user' };
        return next();
    }
    res.status(401).json({ message: 'Unauthorized: No token provided' });
}
