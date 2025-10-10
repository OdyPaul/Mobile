const API_URL = process.env.EXPO_PUBLIC_API_URL;
import axios from "axios";
import AsyncStorage from "@react-native-async-storage/async-storage";

const register = async (userData) =>{
    const response = await axios.post(`${API_URL}/api/mobile/users`, userData)
    if(response.data){
        await AsyncStorage.setItem("user", JSON.stringify(response.data));
    }
    return response.data
}

const login = async (userData) =>{
   try {
     const response = await axios.post(`${API_URL}/api/mobile/users/login`,userData)
    if(response.data){
        const user = response.data

        if(user.token){
            await AsyncStorage.setItem("token", user.token)
        }
        await AsyncStorage.setItem("user", JSON.stringify(user))

        return user
    }
    return null
   } catch (error) {
    const message =
    error.response?.data?.message ||
    error.message ||
    "Login Failed. Please Try again."
    throw new Error(message)
   }
}

const logout=()=>{
    localStorage.removeItem('user')
}

const authService ={
    register,
    login,
    logout
}

export default authService