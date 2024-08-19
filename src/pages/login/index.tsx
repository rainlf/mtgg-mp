import './index.scss'
import {h} from "preact"
import {View} from "@tarojs/components";
import {Button, Input, Avatar} from 'antd-mobile'


export default function Index() {

  return (
    <View className={'loginContainer'}>
      <View className={'info'}>
        <Avatar className={'avatar'} src={''}></Avatar>
        <Input className={'nickname'} placeholder='请输入内容' clearable/>
      </View>
      <Button className={'login'}>{'登录'}</Button>
      {/*<View className={'button'}>*/}
      {/*  <Button className={'login'}>{'登录'}</Button>*/}
      {/*</View>*/}
    </View>
  )
}
