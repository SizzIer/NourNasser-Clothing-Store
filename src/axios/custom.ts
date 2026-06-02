import axios from "axios";

const customFetch = axios.create({
    baseURL: "/api",
    headers: {
        Accept: "application/json"
    }
});

export default customFetch;